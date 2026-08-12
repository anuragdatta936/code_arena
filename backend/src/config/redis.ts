import Redis from "ioredis";
import { env } from "./env";

// Fail fast if REDIS_URL is missing in non-dev environments
if (env.NODE_ENV !== "development" && !env.REDIS_URL) {
  console.error("REDIS_URL is required in production");
  process.exit(1);
}

// Create a singleton Redis client to avoid exhausting connections
// across multiple modules/requests in dev hot-reload.
export const redis = new Redis(env.REDIS_URL ?? "redis://localhost:6379", {
  // Optional: enable TLS for Upstash etc.
  // tls: {},
  // Retry strategy: exponential backoff
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Optional: log connection errors for debugging
redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});