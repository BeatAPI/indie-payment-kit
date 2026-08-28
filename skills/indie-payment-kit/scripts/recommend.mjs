#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const catalogUrl = new URL('../references/provider-catalog.json', import.meta.url);

const choices = {
  market: ['global', 'china', 'both'],
  entity: ['individual', 'china-business', 'global-business'],
  product: ['saas', 'digital-goods', 'api', 'physical', 'marketplace'],
  billing: ['one-time', 'subscription', 'usage', 'credits'],
  tax: ['managed', 'self'],
  stack: ['nextjs', 'tanstack', 'hono', 'other'],
  format: ['markdown', 'json'],
};

export async function loadCatalog() {
  return JSON.parse(await readFile(catalogUrl, 'utf8'));
}

function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) return { help: true };

  const result = {
    market: 'global',
    entity: 'individual',
    product: 'saas',
    billing: 'subscription',
    tax: 'managed',
    stack: 'other',
    format: 'markdown',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);

    const key = token.slice(2);
    if (!(key in choices)) throw new Error(`Unknown option: --${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    if (!choices[key].includes(value)) {
      throw new Error(`Invalid --${key}: ${value}. Choose: ${choices[key].join(', ')}`);
    }
    result[key] = value;
    index += 1;
  }

  return result;
}

function entityScore(provider, profile) {
  if (provider.entityFit.includes(profile.entity)) return 4;

  if (profile.entity === 'china-business' && provider.markets.includes('global')) {
    return 0;
  }

  if (
    profile.entity === 'individual' &&
    profile.market === 'china' &&
    provider.route === 'china-domestic'
  ) {
    return -2;
  }

  return -6;
}

function scoreProvider(provider, profile) {
  let score = 0;
  const reasons = [];

  if (provider.markets.includes(profile.market)) {
    score += 8;
    reasons.push(`serves the ${profile.market} route`);
  } else {
    score -= 12;
  }

  const entityFit = entityScore(provider, profile);
  score += entityFit;
  if (entityFit > 0) reasons.push(`fits the ${profile.entity} profile`);
  if (entityFit <= 0) reasons.push('requires merchant-eligibility verification');

  if (provider.products.includes(profile.product)) {
    score += 4;
    reasons.push(`supports ${profile.product}`);
  } else {
    score -= 12;
  }

  if (provider.billing.includes(profile.billing)) {
    score += 3;
    reasons.push(`supports ${profile.billing} billing`);
  } else {
    score -= 8;
  }

  if (profile.tax === 'managed') {
    score += provider.taxMode === 'managed' ? 6 : -1;
    if (provider.taxMode === 'managed') reasons.push('offers a managed-tax/MoR route');
  } else if (provider.taxMode === 'self') {
    score += 4;
    reasons.push('keeps the seller as the direct merchant');
  }

  if (provider.stacks.includes(profile.stack)) score += 1;

  if (profile.entity === 'individual' && provider.route === 'mor') score += 2;
  if (profile.product === 'marketplace' && provider.route === 'direct') score += 4;
  if (profile.product === 'physical' && provider.route === 'direct') score += 4;
  if (profile.market === 'china' && provider.route === 'china-domestic') score += 3;

  return {
    provider: provider.id,
    name: provider.name,
    route: provider.route,
    score,
    confidence: score >= 22 ? 'high' : score >= 12 ? 'medium' : 'low',
    reasons,
    cautions: provider.cautions,
    officialSkill: provider.officialSkill,
    officialDocs: provider.officialDocs,
    supportLevel: provider.supportLevel,
  };
}

function rankProviders(catalog, profile) {
  return catalog.providers
    .map((provider, index) => ({ ...scoreProvider(provider, profile), index }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ index: _index, ...recommendation }) => recommendation);
}

export function recommendFromCatalog(catalog, profile) {
  for (const [key, allowed] of Object.entries(choices)) {
    if (key === 'format') continue;
    if (!allowed.includes(profile[key])) {
      throw new Error(`Invalid ${key}: ${profile[key]}`);
    }
  }

  if (profile.market === 'both') {
    const globalProfile = { ...profile, market: 'global' };
    const chinaProfile = { ...profile, market: 'china' };
    return {
      profile,
      strategy: 'dual-market',
      recommendations: [
        { role: 'global-primary', ...rankProviders(catalog, globalProfile)[0] },
        { role: 'china-primary', ...rankProviders(catalog, chinaProfile)[0] },
      ],
      disclaimer: catalog.supportStatement,
    };
  }

  const ranked = rankProviders(catalog, profile);
  return {
    profile,
    strategy: 'single-route',
    recommendations: [
      { role: 'primary', ...ranked[0] },
      { role: 'alternative', ...ranked[1] },
    ],
    disclaimer: catalog.supportStatement,
  };
}

export async function recommend(profile) {
  return recommendFromCatalog(await loadCatalog(), profile);
}

function renderMarkdown(result) {
  const lines = [
    '# Payment route recommendation',
    '',
    `Strategy: **${result.strategy}**`,
    '',
    'Profile:',
    '',
    ...Object.entries(result.profile).map(([key, value]) => `- ${key}: ${value}`),
    '',
  ];

  for (const item of result.recommendations) {
    lines.push(
      `## ${item.role}: ${item.name}`,
      '',
      `Route: ${item.route} · Confidence: ${item.confidence} · Score: ${item.score}`,
      '',
      'Why it ranked here:',
      '',
      ...item.reasons.map((reason) => `- ${reason}`),
      '',
      'Verify before committing:',
      '',
      ...item.cautions.map((caution) => `- ${caution}`),
      '',
      `Official Skill: ${item.officialSkill}`,
      `Official docs: ${item.officialDocs}`,
      '',
    );
  }

  lines.push(`> ${result.disclaimer}`);
  return `${lines.join('\n')}\n`;
}

function helpText() {
  return `Usage:
  node recommend.mjs [options]

Options:
  --market   ${choices.market.join('|')}
  --entity   ${choices.entity.join('|')}
  --product  ${choices.product.join('|')}
  --billing  ${choices.billing.join('|')}
  --tax      ${choices.tax.join('|')}
  --stack    ${choices.stack.join('|')}
  --format   ${choices.format.join('|')}
`;
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      process.stdout.write(helpText());
      return;
    }

    const { format, ...profile } = args;
    const result = await recommend(profile);
    process.stdout.write(format === 'json' ? `${JSON.stringify(result, null, 2)}\n` : renderMarkdown(result));
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${helpText()}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
