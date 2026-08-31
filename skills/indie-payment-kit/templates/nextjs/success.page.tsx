export const dynamic = 'force-dynamic';

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; canceled?: string }>;
}) {
  const params = await searchParams;
  const canceled = params.canceled === '1';

  return (
    <main>
      <h1>{canceled ? 'Payment canceled' : 'Payment submitted'}</h1>
      <p>
        Access is granted only after a verified webhook, not by this page.
        {params.order ? ` Order ${params.order} is being confirmed.` : ''}
      </p>
    </main>
  );
}
