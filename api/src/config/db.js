import { MongoClient } from "mongodb";
import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

const mongoUrl = process.env.MONGO_URL;
const redisUrl = process.env.REDIS_URL;

const mongo = new MongoClient(mongoUrl);
const redis = createClient({ url: redisUrl });

export const connectDB = async () => {
    await mongo.connect();
    await redis.connect();
    console.log("Connected to Mongo + Redis");
};

export const db = mongo.db();
export const redisClient = redis;