import { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis";
import { AuthenticatedRequest } from "../middleware/auth";

interface RateLimiterOptions {
  /** Number of tokens to add per second */
  refillRate: number;
  /** Maximum number of tokens in the bucket */
  capacity: number;
  /** Key prefix for Redis */
  prefix?: string;
}

/**
 * Token bucket rate limiter middleware.
 * Stores state in Redis for distributed rate limiting.
 * @param options - Rate limiter options
 * @returns Express middleware
 */
export function rateLimiter(options: RateLimiterOptions) {
  const { refillRate, capacity, prefix = "rate_limit" } = options;

  return async function rateLimiterMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Get user ID from the request (set by auth middleware)
      const userId = req.userId;
      if (!userId) {
        // If no user ID, fall back to IP address? But we require auth for this route.
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Create a unique key for this user and endpoint
      // We include method and path to have different limits for different endpoints
      const key = prefix + ":" + userId + ":" + req.method + ":" + req.path;

      // Lua script for token bucket algorithm
      const luaScript = "local key = KEYS[1]\n" +
        "local now = tonumber(ARGV[1])\n" +
        "local refillRate = tonumber(ARGV[2])\n" +
        "local capacity = tonumber(ARGV[3])\n\n" +

        "-- Get current state\n" +
        "local result = redis.call('HMGET', key, 'tokens', 'lastRefill')\n" +
        "local tokens = tonumber(result[1])\n" +
        "local lastRefill = tonumber(result[2])\n\n" +

        "-- If no state, initialize with full capacity and now as lastRefill\n" +
        "if tokens == nil or lastRefill == nil then\n" +
        "  tokens = capacity\n" +
        "  lastRefill = now\n" +
        "end\n\n" +

        "-- Calculate tokens to add based on time passed\n" +
        "local delta = math.max(0, now - lastRefill)\n" +
        "local newTokens = tokens + delta * refillRate\n" +
        "if newTokens > capacity then\n" +
        "  newTokens = capacity\n" +
        "end\n\n" +

        "local allowed = 0\n" +
        "local tokensLeft = newTokens\n" +
        "local retryAfter = 0\n\n" +

        "if newTokens >= 1 then\n" +
        "  -- Consume one token\n" +
        "  newTokens = newTokens - 1\n" +
        "  allowed = 1\n" +
        "else\n" +
        "  -- Not enough tokens, calculate retry-after (time needed to get one token)\n" +
        "  retryAfter = (1 - newTokens) / refillRate\n" +
        "end\n\n" +

        "-- Update state in Redis\n" +
        "redis.call('HMSET', key, 'tokens', newTokens, 'lastRefill', now)\n" +
        "-- Expire the key after 2 hours of inactivity to clean up old keys\n" +
        "redis.call('EXPIRE', key, 7200)\n\n" +

        "return { allowed, tokensLeft, retryAfter }";

      const now = Date.now() / 1000; // seconds

      // Execute the Lua script
      // Note: ioredis eval takes (script, keys..., args...)
      // The return value is [allowed, tokensLeft, retryAfter] as numbers
      const result = await redis.eval(
        luaScript,
        1, // number of keys
        key,
        now,
        refillRate,
        capacity
      ) as [number, number, number];

      const [allowed, tokensLeft, retryAfter] = result;

      if (allowed === 1) {
        // Request is allowed, proceed to next middleware
        // Optionally, we can set headers for rate limit info
        res.setHeader("X-RateLimit-Remaining", Math.floor(tokensLeft));
        res.setHeader("X-RateLimit-Limit", capacity);
        return next();
      } else {
        // Rate limit exceeded
        res.setHeader("X-RateLimit-Remaining", Math.floor(tokensLeft));
        res.setHeader("X-RateLimit-Limit", capacity);
        res.setHeader("Retry-After", Math.ceil(retryAfter));
        return res.status(429).json({
          error: "Too Many Requests",
          message: "Rate limit exceeded",
        });
      }
    } catch (err) {
      // If Redis fails, we can either fail open or fail closed.
      // For safety, we fail closed (block the request) to avoid overwhelming the system.
      console.error("Rate limiter error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}