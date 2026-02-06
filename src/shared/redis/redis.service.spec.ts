import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { ConfigService } from '@nestjs/config';

describe('RedisService', () => {
  let service: RedisService;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    configService = module.get(ConfigService);
  });

  afterEach(async () => {
    // Clean up Redis connection
    if (service) {
      await service.onModuleDestroy();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Distributed Locking', () => {
    const lockKey = 'test:lock:seat:123';
    const lockValue = 'unique-value-123';

    it('should acquire a lock successfully', async () => {
      await service.onModuleInit();
      const acquired = await service.acquireLock(lockKey, 10, lockValue);

      expect(acquired).toBe(true);

      // Cleanup
      await service.releaseLock(lockKey, lockValue);
    });

    it('should fail to acquire lock when already held', async () => {
      await service.onModuleInit();

      // First acquisition succeeds
      const firstAcquire = await service.acquireLock(lockKey, 10, lockValue);
      expect(firstAcquire).toBe(true);

      // Second acquisition fails
      const secondAcquire = await service.acquireLock(
        lockKey,
        10,
        'different-value',
      );
      expect(secondAcquire).toBe(false);

      // Cleanup
      await service.releaseLock(lockKey, lockValue);
    });

    it('should release lock only with correct value', async () => {
      await service.onModuleInit();

      await service.acquireLock(lockKey, 10, lockValue);

      // Try to release with wrong value
      const wrongRelease = await service.releaseLock(lockKey, 'wrong-value');
      expect(wrongRelease).toBe(false);

      // Release with correct value
      const correctRelease = await service.releaseLock(lockKey, lockValue);
      expect(correctRelease).toBe(true);
    });

    it('should extend lock TTL', async () => {
      await service.onModuleInit();

      await service.acquireLock(lockKey, 5, lockValue);

      const extended = await service.extendLock(lockKey, lockValue, 10);
      expect(extended).toBe(true);

      const ttl = await service.ttl(lockKey);
      expect(ttl).toBeGreaterThan(5); // Should have extended TTL

      // Cleanup
      await service.releaseLock(lockKey, lockValue);
    });

    it('should not extend lock with wrong value', async () => {
      await service.onModuleInit();

      await service.acquireLock(lockKey, 10, lockValue);

      const extended = await service.extendLock(lockKey, 'wrong-value', 10);
      expect(extended).toBe(false);

      // Cleanup
      await service.releaseLock(lockKey, lockValue);
    });
  });

  describe('Cache Operations', () => {
    const cacheKey = 'test:cache:user:456';

    it('should set and get a value', async () => {
      await service.onModuleInit();

      const data = { id: 456, name: 'Test User' };
      await service.set(cacheKey, data);

      const retrieved = await service.get<typeof data>(cacheKey);
      expect(retrieved).toEqual(data);

      // Cleanup
      await service.del(cacheKey);
    });

    it('should set value with TTL', async () => {
      await service.onModuleInit();

      const data = { temporary: true };
      await service.set(cacheKey, data, 5);

      const ttl = await service.ttl(cacheKey);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(5);

      // Cleanup
      await service.del(cacheKey);
    });

    it('should return null for non-existent key', async () => {
      await service.onModuleInit();

      const result = await service.get('non:existent:key');
      expect(result).toBeNull();
    });

    it('should delete keys', async () => {
      await service.onModuleInit();

      await service.set(cacheKey, { data: 'test' });
      const deleted = await service.del(cacheKey);

      expect(deleted).toBe(1);

      const exists = await service.exists(cacheKey);
      expect(exists).toBe(false);
    });

    it('should check key existence', async () => {
      await service.onModuleInit();

      await service.set(cacheKey, { data: 'test' });

      const exists = await service.exists(cacheKey);
      expect(exists).toBe(true);

      await service.del(cacheKey);

      const notExists = await service.exists(cacheKey);
      expect(notExists).toBe(false);
    });
  });

  describe('Counter Operations', () => {
    const counterKey = 'test:counter:requests';

    it('should increment counter', async () => {
      await service.onModuleInit();

      const first = await service.incr(counterKey);
      expect(first).toBe(1);

      const second = await service.incr(counterKey);
      expect(second).toBe(2);

      // Cleanup
      await service.del(counterKey);
    });

    it('should increment by custom amount', async () => {
      await service.onModuleInit();

      const result = await service.incr(counterKey, 5);
      expect(result).toBe(5);

      const next = await service.incr(counterKey, 3);
      expect(next).toBe(8);

      // Cleanup
      await service.del(counterKey);
    });
  });

  describe('TTL Operations', () => {
    const ttlKey = 'test:ttl:key';

    it('should return -2 for non-existent key', async () => {
      await service.onModuleInit();

      const ttl = await service.ttl('non:existent:key');
      expect(ttl).toBe(-2);
    });

    it('should return -1 for key without expiration', async () => {
      await service.onModuleInit();

      await service.set(ttlKey, { data: 'test' }); // No TTL

      const ttl = await service.ttl(ttlKey);
      expect(ttl).toBe(-1);

      // Cleanup
      await service.del(ttlKey);
    });

    it('should return positive TTL for key with expiration', async () => {
      await service.onModuleInit();

      await service.set(ttlKey, { data: 'test' }, 30);

      const ttl = await service.ttl(ttlKey);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(30);

      // Cleanup
      await service.del(ttlKey);
    });
  });
});
