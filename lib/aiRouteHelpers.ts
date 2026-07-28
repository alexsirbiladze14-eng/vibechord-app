/**
 * aiRouteHelpers.ts
 *
 * Two small, shared pieces used by every AI-calling route
 * (tag-vibe, refine, explain-theory):
 *
 * 1. resolveApiKey() — if the request carries a BYOK (bring-your-own-key)
 *    key, use that instead of your own ANTHROPIC_API_KEY. This is the
 *    entire mechanism behind Week 10's BYOK feature: it costs nothing
 *    to implement server-side, because the Anthropic SDK just takes
 *    whichever key you hand it — there's no special "BYOK mode," it's
 *    simply "which key does this specific request want to use."
 *
 * 2. checkRateLimit() — a simple in-memory guard against runaway costs
 *    on YOUR key specifically. BYOK requests skip this entirely, since
 *    a BYOK request spends the user's own Anthropic quota, not yours —
 *    there's nothing of yours to protect in that case.
 *
 * Honest limitation: this rate limiter is in-memory, per server
 * instance. On Vercel, serverless functions can spin up multiple
 * instances, so this is a soft/best-effort limit, not an absolute
 * guarantee — good enough to catch an accidental infinite loop or a
 * bot hammering the endpoint, not a substitute for a real shared store
 * (e.g. Upstash Redis) if this app ever needs a hard guarantee at scale.
 */

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;

const requestLog = new Map<string, number[]>();

export function resolveApiKey(byokKey: unknown): string | null {
  if (typeof byokKey === "string" && byokKey.trim().startsWith("sk-ant-")) {
    return byokKey.trim();
  }
  return process.env.ANTHROPIC_API_KEY ?? null;
}

export function isUsingByok(byokKey: unknown): boolean {
  return typeof byokKey === "string" && byokKey.trim().startsWith("sk-ant-");
}

/** Returns true if this request should be allowed to proceed. Always
 * true for BYOK requests (see file header) — only rate-limits calls
 * that would spend your own API key. */
export function checkRateLimit(identifier: string, usingByok: boolean): boolean {
  if (usingByok) return true;

  const now = Date.now();
  const timestamps = requestLog.get(identifier) ?? [];
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    requestLog.set(identifier, recent);
    return false;
  }

  recent.push(now);
  requestLog.set(identifier, recent);
  return true;
}

/** A stable-enough per-request identifier for rate limiting when no
 * logged-in user id is available — falls back to IP address. */
export function getRateLimitKey(request: Request): string {
  return request.headers.get("x-forwarded-for") ?? "unknown";
}
