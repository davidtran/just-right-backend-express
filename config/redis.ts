import { createClient, RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;

async function connectRedis() {
  redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });

  redisClient.on("error", (err: Error) => {
    console.error("Redis Client Error:", err);
  });

  try {
    await redisClient.connect();
    console.log("Redis connected successfully");
  } catch (error) {
    console.error("Redis connection failed:", error);
  }
}

// Initialize connection
connectRedis().catch(console.error);

// Helper function to get client
export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error("Redis client not initialized");
  }
  return redisClient;
}

export { redisClient };
