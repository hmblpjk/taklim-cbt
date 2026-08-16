import { Redis } from "@upstash/redis";

// In-Memory Fallback Store for Local Development without Upstash Credentials
class MemoryStore {
  private sets: Map<string, Set<string>> = new Map();
  private lists: Map<string, string[]> = new Map();
  private kv: Map<string, string> = new Map();

  async sadd(key: string, member: string): Promise<number> {
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    const set = this.sets.get(key)!;
    if (set.has(member)) return 0;
    set.add(member);
    return 1;
  }

  async sismember(key: string, member: string): Promise<number> {
    const set = this.sets.get(key);
    return set && set.has(member) ? 1 : 0;
  }

  async lpush(key: string, value: string): Promise<number> {
    if (!this.lists.has(key)) this.lists.set(key, []);
    const list = this.lists.get(key)!;
    list.unshift(value);
    return list.length;
  }

  async rpop(key: string): Promise<string | null> {
    const list = this.lists.get(key);
    if (!list || list.length === 0) return null;
    return list.pop() || null;
  }

  async llen(key: string): Promise<number> {
    const list = this.lists.get(key);
    return list ? list.length : 0;
  }

  async set(key: string, value: string): Promise<string> {
    this.kv.set(key, value);
    return "OK";
  }

  async get(key: string): Promise<string | null> {
    return this.kv.get(key) || null;
  }

  async del(key: string): Promise<number> {
    const deletedSets = this.sets.delete(key) ? 1 : 0;
    const deletedLists = this.lists.delete(key) ? 1 : 0;
    const deletedKv = this.kv.delete(key) ? 1 : 0;
    return deletedSets || deletedLists || deletedKv;
  }
}

// Global singleton for memory store across hot reloads
const globalForMemory = globalThis as unknown as { memoryStore?: MemoryStore };
const memoryStore = globalForMemory.memoryStore || new MemoryStore();
if (process.env.NODE_ENV !== "production") globalForMemory.memoryStore = memoryStore;

const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

export const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : (memoryStore as unknown as Redis);

export const isUsingMockRedis = !hasUpstash;
