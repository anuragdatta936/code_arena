import { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis";
import { AuthenticatedRequest } from "../middleware/auth";

interface IdempotencyOptions {
  /** Key prefix for Redis */
  prefix?: string;
  /** TTL for idempotency records in seconds (default 24 hours) */
  ttl?: number;
}

/**
 * Idempotency middleware.
 * If an Idempotency-Key header is present, returns cached response if available.
 * Otherwise, caches the response from the next middleware (for status codes < 500).
 * @param options - Idempotency options
 * @returns Express middleware
 */
export function idempotency(options: IdempotencyOptions = {}) {
  const { prefix = "idempotency", ttl = 86400 } = options;

  return async function idempotencyMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    const idempotencyKey = req.headers["idempotency-key"] as string | undefined;

    // If no idempotency key, proceed normally
    if (!idempotencyKey) {
      return next();
    }

    // Get user ID from the request (set by auth middleware)
    const userId = req.userId;
    if (!userId) {
      // If no user ID, we cannot scope the idempotency key to user, but we can still use the key alone.
      // However, it's better to require auth for idempotency to avoid collisions between users.
      // We'll still proceed without user scope, but log a warning.
      console.warn("No user ID available for idempotency key");
    }

    // Create a key for the idempotency record
    // We scope by userId (if available), method, path, and the idempotency key
    const key = prefix + ":" + (userId ?? "anonymous") + ":" + req.method + ":" + req.path + ":" + idempotencyKey;

    try {
      // Try to get cached response from Redis
      const cached = await redis.get(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Set status code
        res.status(parsed.statusCode);
        // Set Content-Type header if present
        if (parsed.contentType) {
          res.setHeader("Content-Type", parsed.contentType);
        }
        // Send the body
        return res.send(parsed.body);
      }
    } catch (err) {
      // If Redis fails, we log and proceed without idempotency (fail open)
      console.error("Idempotency Redis error:", err);
      // Proceed to next middleware
    }

    // No cached response, we need to call the next middleware and cache the response
    // We'll wrap the res object to capture the response
    const originalSend = res.send;
    let responseCaptured = false;
    let responseStatusCode: number | undefined;
    let responseContentType: string | undefined;
    let responseBody: any;

    // Override res.send to capture the response
    res.send = function (body: any) {
      // Only capture once
      if (responseCaptured) {
        return originalSend.call(this, body);
      }
      responseCaptured = true;
      responseStatusCode = this.statusCode;
      // Guess content type from the header set by the application
      const contentTypeHeader = this.getHeader("Content-Type") as string | string[] | undefined;
      if (Array.isArray(contentTypeHeader)) {
        responseContentType = contentTypeHeader[0];
      } else {
        responseContentType = contentTypeHeader;
      }
      responseBody = body;

      // Call the original send
      const result = originalSend.call(this, body);

      // After sending, we cache the response if status code is < 500
      // Note: We don't use await here to avoid making res.send async
      // Instead, we fire and forget the caching operation
      if (responseStatusCode && responseStatusCode < 500) {
        try {
          const value = JSON.stringify({
            statusCode: responseStatusCode,
            contentType: responseContentType,
            body: responseBody,
          });
          redis.set(key, value, "EX", ttl).catch((cacheErr) => {
            console.error("Failed to cache idempotency response:", cacheErr);
          });
        } catch (cacheErr) {
          console.error("Failed to cache idempotency response:", cacheErr);
        }
      }

      return result;
    };

    // Also override res.json for explicit JSON responses (though it calls send internally)
    // But we override send, so it's covered.

    // Proceed to the next middleware
    next();
  };
}