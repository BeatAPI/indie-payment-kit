import { lstat, mkdir, realpath, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

export async function resolveSafeProjectTarget(project) {
  const resolved = await realpath(path.resolve(project));
  const information = await stat(resolved);
  if (!information.isDirectory()) throw new Error('Project writes require an existing project directory.');

  let resolvedHome = path.resolve(homedir());
  try {
    resolvedHome = await realpath(resolvedHome);
  } catch {
    // Keep the resolved lexical home path when the platform cannot canonicalize it.
  }

  if (resolved === path.parse(resolved).root || resolved === resolvedHome) {
    throw new Error('Refusing to write into a broad system or home directory. Choose the project directory explicitly.');
  }
  return resolved;
}

export function resolveProjectRelativePath(project, relativePath) {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new Error('Project write paths must be non-empty relative paths.');
  }

  const projectDir = path.resolve(project);
  const destination = path.resolve(projectDir, relativePath);
  const relative = path.relative(projectDir, destination);
  if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside the project: ${relativePath}`);
  }
  return destination;
}

export async function assertSafeProjectWritePath(project, relativePath) {
  const projectDir = path.resolve(project);
  const destination = resolveProjectRelativePath(projectDir, relativePath);
  const segments = path.relative(projectDir, destination).split(path.sep);
  let current = projectDir;

  for (const segment of segments) {
    current = path.join(current, segment);
    try {
      const information = await lstat(current);
      if (information.isSymbolicLink()) {
        throw new Error(`Refusing to follow a symbolic link during a project write: ${path.relative(projectDir, current)}`);
      }
    } catch (error) {
      if (error?.code === 'ENOENT') break;
      throw error;
    }
  }

  return destination;
}

export async function prepareSafeProjectDirectory(project, relativePath) {
  const destination = await assertSafeProjectWritePath(project, relativePath);
  await mkdir(destination, { recursive: true });
  await assertSafeProjectWritePath(project, relativePath);
  return destination;
}

export async function prepareSafeProjectFile(project, relativePath) {
  const destination = await assertSafeProjectWritePath(project, relativePath);
  const parent = path.dirname(relativePath);
  if (parent !== '.') await prepareSafeProjectDirectory(project, parent);
  await assertSafeProjectWritePath(project, relativePath);
  return destination;
}
