type Bucket = { startedAt: number; count: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 120;
const MAX_BUCKETS = 5_000;

export function webFormClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function consumeWebFormRateLimit(
  integrationId: string,
  ip: string,
  now = Date.now()
): boolean {
  if (buckets.size > MAX_BUCKETS) {
    for (const [key, bucket] of buckets) {
      if (now - bucket.startedAt >= WINDOW_MS) buckets.delete(key);
    }
  }
  const key = `${integrationId}:${ip}`;
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= MAX_ATTEMPTS;
}

export function resetWebFormRateLimitsForTests(): void {
  buckets.clear();
}
