import { MongoClient } from "mongodb";
import { createClient } from "redis";

const mongoUrl = process.env.MONGO_URL;
const redisUrl = process.env.REDIS_URL;

const mongo = new MongoClient(mongoUrl);
const redis = createClient({ url: redisUrl });

await mongo.connect();
await redis.connect();

console.log("Worker connected to Mongo + Redis");

while (true) {
  console.log("Worker waiting");
  const job = await redis.brPop("queue:jobs", 0);
  if (!job) continue;

  const payload = JSON.parse(job.element);
  console.log("Worker got job:", payload);

  // simulate work
  await new Promise(r => setTimeout(r, 2000));
  console.log("Job done");
}
