/**
 * Redis Client y Cache Management
 * Usado por: Frame Processor, Sign Translation Orchestrator
 */

import redis from 'redis';

let client = null;

export async function initializeRedis() {
  try {
    client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          return new Error('End of retry.');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Retry time exhausted.');
        }
        if (options.attempt > 10) {
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    client.on('error', (err) => {
      console.error('[Redis] Error:', err);
    });

    client.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    client.on('reconnecting', () => {
      console.log('[Redis] Reconnecting...');
    });

    await client.connect();
    return client;
  } catch (error) {
    console.error('[Redis] Failed to initialize:', error);
    throw error;
  }
}

export function getRedisClient() {
  if (!client) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
  }
  return client;
}

/**
 * Guardar valor en cache con TTL
 */
export async function cacheSet(key, value, ttl = 3600) {
  try {
    const client = getRedisClient();
    const serialized = JSON.stringify(value);
    await client.setEx(key, ttl, serialized);
    return true;
  } catch (error) {
    console.error(`[Cache] Set error for ${key}:`, error);
    return false;
  }
}

/**
 * Obtener valor de cache
 */
export async function cacheGet(key) {
  try {
    const client = getRedisClient();
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`[Cache] Get error for ${key}:`, error);
    return null;
  }
}

/**
 * Eliminar clave de cache
 */
export async function cacheDel(key) {
  try {
    const client = getRedisClient();
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`[Cache] Delete error for ${key}:`, error);
    return false;
  }
}

/**
 * Limpiar todas las claves que coincidan con patrón
 */
export async function cacheFlush(pattern = '*') {
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
    return keys.length;
  } catch (error) {
    console.error('[Cache] Flush error:', error);
    return 0;
  }
}

/**
 * Pub/Sub para comunicación entre microservicios
 */
export async function publishEvent(channel, data) {
  try {
    const client = getRedisClient();
    await client.publish(channel, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`[PubSub] Publish error on ${channel}:`, error);
    return false;
  }
}

/**
 * Suscribirse a eventos
 */
export async function subscribeToEvent(channel, callback) {
  try {
    const subscriberClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined
    });

    await subscriberClient.connect();

    subscriberClient.subscribe(channel, (message) => {
      try {
        const data = JSON.parse(message);
        callback(data);
      } catch (error) {
        console.error('[PubSub] Parse error:', error);
      }
    });

    return subscriberClient;
  } catch (error) {
    console.error(`[PubSub] Subscribe error on ${channel}:`, error);
    throw error;
  }
}

/**
 * Obtener información de Redis
 */
export async function getRedisInfo() {
  try {
    const client = getRedisClient();
    const info = await client.info();
    return info;
  } catch (error) {
    console.error('[Redis] Info error:', error);
    return null;
  }
}

/**
 * Cerrar conexión
 */
export async function closeRedis() {
  try {
    if (client) {
      await client.quit();
      client = null;
      console.log('[Redis] Connection closed');
    }
  } catch (error) {
    console.error('[Redis] Close error:', error);
  }
}
