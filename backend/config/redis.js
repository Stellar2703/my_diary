import Redis from 'ioredis';
import logger from './logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
  enableReadyCheck: false,
  enableOfflineQueue: false,
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('connect', () => {
  logger.info('✅ Redis connected successfully');
});

redis.on('error', (err) => {
  logger.error('❌ Redis error:', { error: err.message });
});

redis.on('close', () => {
  logger.warn('⚠️ Redis connection closed');
});

// Helper functions for common Redis operations
export const redisCache = {
  async get(key) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      logger.error('Redis get error:', { key, error: err.message });
      return null;
    }
  },

  async set(key, value, expirySeconds = 3600) {
    try {
      await redis.setex(key, expirySeconds, JSON.stringify(value));
      return true;
    } catch (err) {
      logger.error('Redis set error:', { key, error: err.message });
      return false;
    }
  },

  async delete(key) {
    try {
      await redis.del(key);
      return true;
    } catch (err) {
      logger.error('Redis delete error:', { key, error: err.message });
      return false;
    }
  },

  async exists(key) {
    try {
      return (await redis.exists(key)) === 1;
    } catch (err) {
      logger.error('Redis exists error:', { key, error: err.message });
      return false;
    }
  }
};

process.on('SIGINT', async () => {
  await redis.quit();
  logger.info('Redis connection closed');
});

export default redis;
