/** Cloudflare Web Analytics is cookieless. Returns the data-cf-beacon JSON, or null to emit nothing. */
export function beaconConfig(token: string | undefined): string | null {
  const t = token?.trim();
  return t ? JSON.stringify({ token: t }) : null;
}
