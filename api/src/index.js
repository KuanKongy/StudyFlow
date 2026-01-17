import express from "express";
import { MongoClient } from "mongodb";
import { createClient } from "redis";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const mongoUrl = process.env.MONGO_URL;
const redisUrl = process.env.REDIS_URL;

const mongo = new MongoClient(mongoUrl);
const redis = createClient({ url: redisUrl });

await mongo.connect();
await redis.connect();

console.log("API connected to Mongo + Redis");

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// test endpoint
app.post("/enqueue", async (req, res) => {
  await redis.lPush("queue:jobs", JSON.stringify({ 
    type: "test", 
    at: Date.now() 
  }));
  res.json({ queued: true });
});

app.listen(4000, () => {
  console.log("API listening on 4000");
});
