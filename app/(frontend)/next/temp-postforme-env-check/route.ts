// TEMP — confirms the deployed server can reach Post for Me using the
// POSTFORME_API_KEY / POSTFORME_FACEBOOK_ACCOUNT_ID env vars just added
// in Vercel. Makes a read-only call to Post for Me (no post is created).
// Returns only non-sensitive fields (platform, name, connection status) —
// the API key and any tokens never appear in the response. Delete after
// use — do not leave this committed (see CLAUDE.md's temp-route pattern).
export async function GET() {
  const apiKey = process.env.POSTFORME_API_KEY;
  const accountId = process.env.POSTFORME_FACEBOOK_ACCOUNT_ID;

  if (!apiKey || !accountId) {
    return Response.json({ ok: false, reason: "env vars missing on this deployment" });
  }

  const res = await fetch("https://api.postforme.dev/v1/social-accounts?platform=facebook", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    return Response.json({ ok: false, reason: `Post for Me returned ${res.status}` });
  }

  const body = await res.json();
  const account = body?.data?.find((a: { id: string }) => a.id === accountId);
  return Response.json({
    ok: true,
    accountIdMatches: Boolean(account),
    username: account?.username ?? null,
    status: account?.status ?? null,
  });
}
