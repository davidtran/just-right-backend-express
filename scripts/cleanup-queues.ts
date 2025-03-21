import dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../.env.local" });

import Redis from "redis";
import { promisify } from "util";

// Connect to Redis
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
  process.exit(1);
});

// Promisify Redis commands
const scanAsync = promisify(redisClient.scan).bind(redisClient);
const keysAsync = promisify(redisClient.keys).bind(redisClient);
const delAsync = promisify(redisClient.del).bind(redisClient);
const ttlAsync = promisify(redisClient.ttl).bind(redisClient);

async function cleanupQueues() {
  console.log("Starting Redis queue cleanup...");

  try {
    // Find all bee-queue related keys
    const queueKeys = await keysAsync("bq:note-audio-queue:*");
    console.log(`Found ${queueKeys.length} queue-related keys`);

    // Check for stuck jobs (jobs that are processing for too long)
    const stuckJobsPattern = "bq:note-audio-queue:active";
    const stuckJobs = await keysAsync(stuckJobsPattern);

    if (stuckJobs.length > 0) {
      console.log(`Found ${stuckJobs.length} potentially stuck jobs`);

      // You can add logic here to check job timestamps and remove truly stuck jobs
      // This is a simplified approach
      for (const jobKey of stuckJobs) {
        const ttl = await ttlAsync(jobKey);
        if (ttl === -1) {
          // Key with no expiration might be stuck
          console.log(`Removing potentially stuck job: ${jobKey}`);
          await delAsync(jobKey);
        }
      }
    } else {
      console.log("No stuck jobs found");
    }

    // Optional: Clean up old completed/failed jobs if needed
    // const oldJobsPattern = 'bq:note-audio-queue:id:*';
    // const oldJobs = await keysAsync(oldJobsPattern);
    // console.log(`Found ${oldJobs.length} old job records`);

    console.log("Queue cleanup completed");
  } catch (error) {
    console.error("Error during cleanup:", error);
  } finally {
    redisClient.quit();
  }
}

// Run the cleanup
cleanupQueues();
