// A minimal in-memory, fixed-window rate limiter.
//
// Deliberately simple, with a real limitation to be upfront about: this only
// works correctly for a SINGLE server process. On Vercel (many concurrent,
// short-lived function instances) or any multi-instance deployment, each
// instance has its own counters, so the effective limit is roughly
// (per-instance limit) × (concurrent instances) — real, but looser than the
// configured number. For a self-hosted single process (or a low-traffic
// deployment), it's a real, meaningful floor and costs nothing to run.
//
// To close that gap for a real multi-instance production deployment, swap
// this module's internals for a shared store (e.g. Upstash Redis) without
// changing any call site — every caller only sees rateLimit()/clientKey().

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

// Crude but bounded: if an unreasonable number of distinct keys accumulate
// (e.g. many spoofed IPs), just reset rather than growing forever.
const MAX_TRACKED_KEYS = 5000;

export function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds?: number;
}

/** At most `limit` calls per `windowMs`, per key. */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    if (buckets.size >= MAX_TRACKED_KEYS) buckets.clear();
    buckets.set(key, { count: 1, windowStart: now });
    return { ok: true };
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.windowStart + windowMs - now) / 1000));
    return { ok: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { ok: true };
}

export function rateLimitResponse(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
