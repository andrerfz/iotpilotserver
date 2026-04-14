import {vi} from 'vitest';

/**
 * Mock Redis service for testing
 */
export class RedisMockService {
    private data: Map<string, any> = new Map();
    private pubSubChannels: Map<string, Set<(message: string) => void>> = new Map();

    // Mock Redis client methods
    get = vi.fn().mockImplementation(async (key: string) => {
        return this.data.get(key) || null;
    });

    set = vi.fn().mockImplementation(async (key: string, value: any) => {
        this.data.set(key, value);
        return 'OK';
    });

    setex = vi.fn().mockImplementation(async (key: string, ttl: number, value: any) => {
        this.data.set(key, value);
        // In a real implementation, we'd set a TTL, but for testing we can ignore it
        return 'OK';
    });

    del = vi.fn().mockImplementation(async (...keys: string[]) => {
        let deletedCount = 0;
        for (const key of keys) {
            if (this.data.delete(key)) {
                deletedCount++;
            }
        }
        return deletedCount;
    });

    exists = vi.fn().mockImplementation(async (...keys: string[]) => {
        let existsCount = 0;
        for (const key of keys) {
            if (this.data.has(key)) {
                existsCount++;
            }
        }
        return existsCount;
    });

    expire = vi.fn().mockImplementation(async (key: string, ttl: number) => {
        // For testing, we don't actually expire keys
        return this.data.has(key) ? 1 : 0;
    });

    ttl = vi.fn().mockImplementation(async (key: string) => {
        // Return -1 to indicate no TTL (or we could return -2 if key doesn't exist)
        return this.data.has(key) ? -1 : -2;
    });

    incr = vi.fn().mockImplementation(async (key: string) => {
        const currentValue = this.data.get(key) || 0;
        const newValue = parseInt(currentValue.toString()) + 1;
        this.data.set(key, newValue);
        return newValue;
    });

    decr = vi.fn().mockImplementation(async (key: string) => {
        const currentValue = this.data.get(key) || 0;
        const newValue = parseInt(currentValue.toString()) - 1;
        this.data.set(key, newValue);
        return newValue;
    });

    // Hash operations
    hget = vi.fn().mockImplementation(async (key: string, field: string) => {
        const hash = this.data.get(key);
        if (!hash || typeof hash !== 'object') {
            return null;
        }
        return hash[field] || null;
    });

    hset = vi.fn().mockImplementation(async (key: string, field: string, value: any) => {
        let hash = this.data.get(key);
        if (!hash || typeof hash !== 'object') {
            hash = {};
            this.data.set(key, hash);
        }
        hash[field] = value;
        return 1;
    });

    hgetall = vi.fn().mockImplementation(async (key: string) => {
        const hash = this.data.get(key);
        if (!hash || typeof hash !== 'object') {
            return {};
        }
        return hash;
    });

    hdel = vi.fn().mockImplementation(async (key: string, ...fields: string[]) => {
        const hash = this.data.get(key);
        if (!hash || typeof hash !== 'object') {
            return 0;
        }
        let deletedCount = 0;
        for (const field of fields) {
            if (field in hash) {
                delete hash[field];
                deletedCount++;
            }
        }
        return deletedCount;
    });

    // List operations
    lpush = vi.fn().mockImplementation(async (key: string, ...values: any[]) => {
        let list = this.data.get(key);
        if (!Array.isArray(list)) {
            list = [];
            this.data.set(key, list);
        }
        list.unshift(...values.reverse());
        return list.length;
    });

    rpush = vi.fn().mockImplementation(async (key: string, ...values: any[]) => {
        let list = this.data.get(key);
        if (!Array.isArray(list)) {
            list = [];
            this.data.set(key, list);
        }
        list.push(...values);
        return list.length;
    });

    lpop = vi.fn().mockImplementation(async (key: string) => {
        const list = this.data.get(key);
        if (!Array.isArray(list) || list.length === 0) {
            return null;
        }
        return list.shift();
    });

    rpop = vi.fn().mockImplementation(async (key: string) => {
        const list = this.data.get(key);
        if (!Array.isArray(list) || list.length === 0) {
            return null;
        }
        return list.pop();
    });

    lrange = vi.fn().mockImplementation(async (key: string, start: number, end: number) => {
        const list = this.data.get(key);
        if (!Array.isArray(list)) {
            return [];
        }
        return list.slice(start, end + 1);
    });

    // Set operations
    sadd = vi.fn().mockImplementation(async (key: string, ...members: any[]) => {
        let set = this.data.get(key);
        if (!(set instanceof Set)) {
            set = new Set();
            this.data.set(key, set);
        }
        let addedCount = 0;
        for (const member of members) {
            if (!set.has(member)) {
                set.add(member);
                addedCount++;
            }
        }
        return addedCount;
    });

    srem = vi.fn().mockImplementation(async (key: string, ...members: any[]) => {
        const set = this.data.get(key);
        if (!(set instanceof Set)) {
            return 0;
        }
        let removedCount = 0;
        for (const member of members) {
            if (set.has(member)) {
                set.delete(member);
                removedCount++;
            }
        }
        return removedCount;
    });

    sismember = vi.fn().mockImplementation(async (key: string, member: any) => {
        const set = this.data.get(key);
        if (!(set instanceof Set)) {
            return 0;
        }
        return set.has(member) ? 1 : 0;
    });

    smembers = vi.fn().mockImplementation(async (key: string) => {
        const set = this.data.get(key);
        if (!(set instanceof Set)) {
            return [];
        }
        return Array.from(set);
    });

    // Pub/Sub operations
    publish = vi.fn().mockImplementation(async (channel: string, message: string) => {
        const subscribers = this.pubSubChannels.get(channel);
        if (subscribers) {
            subscribers.forEach(callback => {
                try {
                    callback(message);
                } catch (error) {
                    console.error('Error in Redis mock subscriber:', error);
                }
            });
        }
        return subscribers ? subscribers.size : 0;
    });

    subscribe = vi.fn().mockImplementation(async (channel: string, callback: (message: string) => void) => {
        let subscribers = this.pubSubChannels.get(channel);
        if (!subscribers) {
            subscribers = new Set();
            this.pubSubChannels.set(channel, subscribers);
        }
        subscribers.add(callback);
        return 1;
    });

    unsubscribe = vi.fn().mockImplementation(async (channel: string, callback?: (message: string) => void) => {
        if (callback) {
            const subscribers = this.pubSubChannels.get(channel);
            if (subscribers) {
                subscribers.delete(callback);
                if (subscribers.size === 0) {
                    this.pubSubChannels.delete(channel);
                }
            }
        } else {
            this.pubSubChannels.delete(channel);
        }
        return 1;
    });

    // Connection methods
    connect = vi.fn().mockResolvedValue(undefined);
    disconnect = vi.fn().mockResolvedValue(undefined);
    isOpen = vi.fn().mockReturnValue(true);

    // Utility methods for testing
    getData(): Map<string, any> {
        return new Map(this.data);
    }

    clearData(): void {
        this.data.clear();
        this.pubSubChannels.clear();
    }

    setData(key: string, value: any): void {
        this.data.set(key, value);
    }

    getDataByKey(key: string): any {
        return this.data.get(key);
    }

    hasData(key: string): boolean {
        return this.data.has(key);
    }

    getSubscriberCount(channel: string): number {
        const subscribers = this.pubSubChannels.get(channel);
        return subscribers ? subscribers.size : 0;
    }
}

/**
 * Factory function to create a Redis mock service
 */
export function createRedisMock(): RedisMockService {
    return new RedisMockService();
}

/**
 * Mock Redis module for import mocking
 */
export const redisMockModule = {
    createClient: vi.fn().mockImplementation(() => createRedisMock()),
};
