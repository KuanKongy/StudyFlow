import express from "express";
import { MongoClient } from "mongodb";
import { createClient } from "redis";
import { auth } from "express-oauth2-jwt-bearer";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoUrl = process.env.MONGO_URL;
const redisUrl = process.env.REDIS_URL;

const mongo = new MongoClient(mongoUrl);
const redis = createClient({ url: redisUrl });

await mongo.connect();
await redis.connect();

const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
});

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

app.get("/api/private", checkJwt, (req, res) => {
  res.json({
    message: "You are authenticated!",
    user: req.auth.payload
  });
});

app.listen(4000, () => {
  console.log("API listening on 4000");
});
