import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * RedisService - Manages Redis connections and operations
 *
 * Provides distributed locking, caching, and TTL-based expiration
 * following Single Responsibility Principle
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    this.client = new Redis({
      host,
      port,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      this.logger.log(`Connected to Redis at ${host}:${port}`);
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });

    // Test connection
    try {
      await this.client.ping();
      this.logger.log('Redis health check: OK');
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }

  /**
   * Acquire a distributed lock with automatic expiration
   *
   * Uses SET NX EX for atomicity - prevents race conditions
   * @param key - Lock identifier
   * @param ttlSeconds - Time to live in seconds
   * @param value - Unique lock value (typically a UUID)
   * @returns true if lock acquired, false otherwise
   */
  async acquireLock(
    key: string,
    ttlSeconds: number,
    value: string,
  ): Promise<boolean> {
    try {
      // SET key value NX EX ttl - atomic operation
      const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.error(`Failed to acquire lock ${key}:`, error);
      return false;
    }
  }

  /**
   * Release a distributed lock safely
   *
   * Uses Lua script for atomic check-and-delete
   * Only releases if the lock is held by the caller
   * @param key - Lock identifier
   * @param value - Lock value to verify ownership
   * @returns true if released, false if not owned
   */
  async releaseLock(key: string, value: string): Promise<boolean> {
    try {
      // Lua script ensures atomic check and delete
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.client.eval(script, 1, key, value);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to release lock ${key}:`, error);
      return false;
    }
  }

  /**
   * Extend lock TTL if still owned
   *
   * @param key - Lock identifier
   * @param value - Lock value to verify ownership
   * @param additionalSeconds - Additional TTL in seconds
   * @returns true if extended, false otherwise
   */
  async extendLock(
    key: string,
    value: string,
    additionalSeconds: number,
  ): Promise<boolean> {
    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("expire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

      const result = await this.client.eval(
        script,
        1,
        key,
        value,
        additionalSeconds,
      );
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to extend lock ${key}:`, error);
      return false;
    }
  }

  /**
   * Set a value with TTL
   *
   * @param key - Cache key
   * @param value - Value to store (will be JSON stringified)
   * @param ttlSeconds - Time to live in seconds
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Failed to set key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a value by key
   *
   * @param key - Cache key
   * @returns Parsed value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Failed to get key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete one or more keys
   *
   * @param keys - Keys to delete
   * @returns Number of keys deleted
   */
  async del(...keys: string[]): Promise<number> {
    try {
      return await this.client.del(...keys);
    } catch (error) {
      this.logger.error(`Failed to delete keys:`, error);
      return 0;
    }
  }

  /**
   * Check if a key exists
   *
   * @param key - Key to check
   * @returns true if exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check existence of key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL of a key in seconds
   *
   * @param key - Key to check
   * @returns TTL in seconds, -1 if no expiration, -2 if not found
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      this.logger.error(`Failed to get TTL of key ${key}:`, error);
      return -2;
    }
  }

  /**
   * Increment a numeric value atomically
   *
   * @param key - Counter key
   * @param increment - Amount to increment (default 1)
   * @returns New value after increment
   */
  async incr(key: string, increment: number = 1): Promise<number> {
    try {
      if (increment === 1) {
        return await this.client.incr(key);
      }
      return await this.client.incrby(key, increment);
    } catch (error) {
      this.logger.error(`Failed to increment key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Acquire locks for multiple seats atomically
   *
   * CRITICAL: Keys must be pre-sorted to avoid deadlocks
   * Uses Lua script for atomicity - all or nothing
   *
   * @param seatKeys - Array of seat lock keys (MUST be sorted)
   * @param lockValue - Unique lock value (typically UUID)
   * @param ttlSeconds - Time to live in seconds
   * @returns { success: boolean, failedKey?: string }
   */
  async acquireMultipleLocks(
    seatKeys: string[],
    lockValue: string,
    ttlSeconds: number,
  ): Promise<{ success: boolean; failedKey?: string }> {
    if (seatKeys.length === 0) {
      return { success: true };
    }

    try {
      /**
       * Lua script garante atomicidade total:
       * 1. Tenta SET NX EX em cada assento
       * 2. Se qualquer falhar, faz rollback de todos os anteriores
       * 3. Retorna sucesso apenas se TODOS foram locked
       *
       * IMPORTANTE: Todo o script executa atomicamente no Redis
       * Nenhuma outra operação pode acontecer entre os SETs
       */
      const luaScript = `
        local lockValue = ARGV[1]
        local ttl = tonumber(ARGV[2])
        
        -- Tentar lockar cada assento atomicamente
        for i, key in ipairs(KEYS) do
          local result = redis.call('SET', key, lockValue, 'EX', ttl, 'NX')
          
          -- Se falhou (assento já locked)
          if not result then
            -- Rollback: remover locks que conseguimos até agora
            for j = 1, i - 1 do
              local val = redis.call('GET', KEYS[j])
              if val == lockValue then
                redis.call('DEL', KEYS[j])
              end
            end
            return { 'FAILED', key }
          end
        end
        
        -- Sucesso: todos os assentos foram locked
        return { 'OK', lockValue }
      `;

      const result = await this.client.eval(
        luaScript,
        seatKeys.length,
        ...seatKeys,
        lockValue,
        ttlSeconds,
      );

      const [status, data] = result as [string, string];

      if (status === 'OK') {
        return { success: true };
      } else {
        return { success: false, failedKey: data };
      }
    } catch (error) {
      this.logger.error('Failed to acquire multiple locks:', error);
      return { success: false };
    }
  }

  /**
   * Release locks for multiple seats atomically
   *
   * Only releases locks that are owned by the caller
   * @param seatKeys - Array of seat lock keys
   * @param lockValue - Lock value to verify ownership
   * @returns Number of locks released
   */
  async releaseMultipleLocks(
    seatKeys: string[],
    lockValue: string,
  ): Promise<number> {
    if (seatKeys.length === 0) {
      return 0;
    }

    try {
      const luaScript = `
        local lockValue = ARGV[1]
        local released = 0
        
        for i, key in ipairs(KEYS) do
          local val = redis.call('GET', key)
          if val == lockValue then
            redis.call('DEL', key)
            released = released + 1
          end
        end
        
        return released
      `;

      const result = await this.client.eval(
        luaScript,
        seatKeys.length,
        ...seatKeys,
        lockValue,
      );

      return result as number;
    } catch (error) {
      this.logger.error('Failed to release multiple locks:', error);
      return 0;
    }
  }

  /**
   * Get the raw Redis client for advanced operations
   *
   * Use with caution - prefer using service methods
   */
  getClient(): Redis {
    return this.client;
  }
}
