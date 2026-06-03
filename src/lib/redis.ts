import { Redis } from '@upstash/redis';
import { env }   from '@/lib/env';

let client: Redis | null = null;

/**
 * Returns a shared Upstash Redis client, or null when credentials are absent
 * (local dev without Upstash). Callers must handle the null case gracefully.
 */
export function getRedisClient(): Redis | null {
  if (!env.UPSTASH_URL || !env.UPSTASH_TOKEN) return null;
  if (!client) {
    client = new Redis({ url: env.UPSTASH_URL, token: env.UPSTASH_TOKEN });
  }
  return client;
}
