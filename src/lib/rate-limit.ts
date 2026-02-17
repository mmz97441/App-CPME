interface RateLimitOptions {
  interval: number;
  uniqueTokenPerInterval: number;
}

interface TokenBucket {
  count: number;
  lastReset: number;
}

const tokenBuckets = new Map<string, TokenBucket>();

export function rateLimit(options: RateLimitOptions) {
  return {
    check: async (
      token: string,
      limit: number
    ): Promise<{ success: boolean; remaining: number }> => {
      const now = Date.now();
      const bucket = tokenBuckets.get(token);

      if (!bucket || now - bucket.lastReset > options.interval) {
        tokenBuckets.set(token, { count: 1, lastReset: now });
        return { success: true, remaining: limit - 1 };
      }

      if (bucket.count >= limit) {
        return { success: false, remaining: 0 };
      }

      bucket.count++;
      return { success: true, remaining: limit - bucket.count };
    },
  };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  tokenBuckets.forEach((bucket, key) => {
    if (now - bucket.lastReset > 60 * 60 * 1000) {
      tokenBuckets.delete(key);
    }
  });
}, 60 * 60 * 1000);
