import express from "express";
import { MongoClient, ObjectId } from "mongodb";
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
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`
});

const validateId = (req, res, next) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      error: "Invalid ID format",
      message: `The provided ID '${id}' is not a valid 24-character hex string.`
    });
  }
  next();
};

const db = mongo.db();
const Notes = db.collection("notes");
const Jobs = db.collection("jobs");
const Flashcards = db.collection("flashcards");
const Users = db.collection("users");
const StudyMaterials = db.collection("studyMaterials");
const FlashcardSets = db.collection("flashcardSets");
const Groups = db.collection("groups");
const Topics = db.collection("topics");
const GroupAuditLog = db.collection("groupAuditLog");

await StudyMaterials.createIndex({ ownerId: 1 });
await StudyMaterials.createIndex({ topicId: 1 });
await StudyMaterials.createIndex({ type: 1 });
await Jobs.createIndex({ ownerId: 1 });
await Jobs.createIndex({ status: 1 });
await Flashcards.createIndex({ setId: 1 });
await Groups.createIndex({ ownerId: 1 });
await Groups.createIndex({ memberIds: 1 });
await Groups.createIndex({ joinCode: 1 }, { sparse: true });
await Topics.createIndex({ ownerId: 1 });
await Topics.createIndex({ groupIds: 1 });
await GroupAuditLog.createIndex({ groupId: 1 });
await Users.createIndex({ authId: 1 }, { unique: true });
await Users.createIndex({ username: 1 }, { unique: true, sparse: true });

console.log("API connected to Mongo + Redis");

// --- Shared username validation (used by user creation AND profile update) ---
const USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

function sanitizeUsername(raw) {
  if (!raw) return "user";
  return raw.replace(/[^a-zA-Z0-9._]/g, "").slice(0, 30) || "user";
}

async function validateUsername(username, currentAuthId) {
  if (!username || username.length === 0) {
    return { valid: false, error: "Username is required" };
  }
  if (username.length > 30) {
    return { valid: false, error: "Username must be 30 characters or fewer" };
  }
  if (!USERNAME_REGEX.test(username)) {
    return { valid: false, error: "Only letters, numbers, periods, and underscores allowed" };
  }
  const existing = await Users.findOne({ username, authId: { $ne: currentAuthId } });
  if (existing) {
    return { valid: false, error: "Username is already taken" };
  }
  return { valid: true };
}

async function generateUniqueUsername(base, authId) {
  const sanitized = sanitizeUsername(base);
  const check = await Users.findOne({ username: sanitized, authId: { $ne: authId } });
  if (!check) return sanitized;
  for (let i = 1; i < 1000; i++) {
    const candidate = `${sanitized.slice(0, 26)}${i}`;
    const taken = await Users.findOne({ username: candidate, authId: { $ne: authId } });
    if (!taken) return candidate;
  }
  return `${sanitized.slice(0, 20)}${Date.now().toString(36)}`;
}

// --- Middleware: rate-001 — 10 AI requests per user per hour ---
const aiRateLimiter = async (req, res, next) => {
  const userId = req.auth.payload.sub;
  const key = `rate:${userId}:ai`;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 3600);
    }
    if (count > 10) {
      return res.status(429).json({ error: "Rate limit exceeded. Max 10 AI requests per hour." });
    }
  } catch (err) {
    console.error("Rate limiter error:", err);
  }
  next();
};

// --- Middleware: ai-002 — circuit breaker check ---
const aiCircuitBreaker = async (req, res, next) => {
  try {
    const tripped = await redis.get("circuit-breaker:openai");
    if (tripped) {
      return res.status(503).json({ error: "AI processing temporarily unavailable" });
    }
  } catch (err) {
    console.error("Circuit breaker check error:", err);
  }
  next();
};

// --- Helper: check if user can access a material (auth-005 / gov-001) ---
async function canAccessMaterial(material, userId) {
  if (material.ownerId === userId) return true;
  if (!material.topicId) return false;
  const topic = await Topics.findOne({ _id: material.topicId });
  if (!topic) return false;
  if (topic.ownerId === userId) return true;
  if (!topic.groupIds || topic.groupIds.length === 0) return false;
  const group = await Groups.findOne({
    _id: { $in: topic.groupIds },
    memberIds: userId
  });
  return !!group;
}

// Health Check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Test endpoint
app.post("/enqueue", async (req, res) => {
  const { insertedId } = await Jobs.insertOne({
    type: "TEST",
    status: "queued",
    createdAt: Date.now(),
  });
  await redis.lPush("queue:jobs", JSON.stringify({ jobId: insertedId.toString() }));
  res.json({ jobId: insertedId });
});

app.use("/api", checkJwt);

// Test Auth
app.get("/api/private", (req, res) => {
  res.json({
    message: "You are authenticated!",
    user: req.auth.payload
  });
});

// ===================== Users =====================

app.get("/api/me", async (req, res) => {
  const authId = req.auth.payload.sub;
  let user = await Users.findOne({ authId });
  if (user) return res.json(user);

  const accessToken = req.headers.authorization.split(" ")[1];
  let userInfo = {};
  try {
    const userInfoRes = await fetch(
      `https://${process.env.AUTH0_DOMAIN}/userinfo`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (userInfoRes.ok) {
      userInfo = await userInfoRes.json();
    }
  } catch (_) { /* /userinfo unavailable — use fallback */ }

  const rawUsername = userInfo.email?.split("@")[0] ?? userInfo.nickname ?? authId.split("|").pop() ?? "user";
  const username = await generateUniqueUsername(rawUsername, authId);
  const displayName = userInfo.name ?? username;

  user = {
    authId,
    email: userInfo.email ?? null,
    username,
    name: displayName,
    picture: userInfo.picture ?? null,
    onboardedAt: null,
    createdAt: Date.now(),
  };
  await Users.insertOne(user);
  res.json(user);
});

app.put("/api/me", async (req, res) => {
  const authId = req.auth.payload.sub;
  const { username, name, picture, onboardedAt } = req.body;
  if (!username && !name && picture === undefined && onboardedAt === undefined) {
    return res.status(400).json({ error: "Provide at least one of: username, name, picture, onboardedAt" });
  }
  const updateDoc = { $set: {} };
  if (username) {
    const v = await validateUsername(username, authId);
    if (!v.valid) return res.status(400).json({ error: v.error });
    updateDoc.$set.username = username;
  }
  if (name !== undefined) {
    if (typeof name === "string" && name.length > 30) {
      return res.status(400).json({ error: "Display name must be 30 characters or fewer" });
    }
    updateDoc.$set.name = name;
  }
  if (picture !== undefined) updateDoc.$set.picture = picture;
  if (onboardedAt !== undefined) updateDoc.$set.onboardedAt = onboardedAt;
  const result = await Users.updateOne({ authId }, updateDoc);
  if (result.matchedCount === 0) return res.status(404).json({ error: "User not found" });
  const user = await Users.findOne({ authId });
  res.json(user);
});

app.get("/api/users/:id", async (req, res) => {
  const user = await Users.findOne({ _id: new ObjectId(req.params.id) });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// Batch user lookup by authIds (for member display)
app.post("/api/users/batch", async (req, res) => {
  const { authIds } = req.body;
  if (!authIds || !Array.isArray(authIds)) {
    return res.status(400).json({ error: "authIds array required" });
  }
  const users = await Users.find({ authId: { $in: authIds } }).toArray();
  res.json(users);
});

// data-005 — Account deletion cascade
app.delete("/api/account", async (req, res) => {
  const userId = req.auth.payload.sub;
  try {
    const allJobs = await redis.lRange("queue:jobs", 0, -1);
    for (const raw of allJobs) {
      try {
        const { jobId } = JSON.parse(raw);
        const job = await Jobs.findOne({ _id: new ObjectId(jobId) });
        if (job && job.ownerId === userId) {
          await redis.lRem("queue:jobs", 1, raw);
        }
      } catch (_) { /* skip malformed entries */ }
    }

    const userMaterials = await StudyMaterials.find({ ownerId: userId }).toArray();
    const materialIds = userMaterials.map(m => m._id);
    const userSets = await FlashcardSets.find({ materialId: { $in: materialIds } }).toArray();
    const setIds = userSets.map(s => s._id);

    await Flashcards.deleteMany({ setId: { $in: setIds } });
    await FlashcardSets.deleteMany({ _id: { $in: setIds } });
    await Notes.deleteMany({ materialId: { $in: materialIds } });
    await StudyMaterials.deleteMany({ ownerId: userId });
    await Topics.deleteMany({ ownerId: userId });
    await Jobs.deleteMany({ ownerId: userId });
    await GroupAuditLog.deleteMany({ $or: [{ actorId: userId }, { targetId: userId }] });
    await Groups.updateMany({}, { $pull: { memberIds: userId } });
    await Groups.deleteMany({ ownerId: userId });
    await Users.deleteOne({ authId: userId });

    const cacheKeys = await redis.keys(`cache:${userId}:*`);
    if (cacheKeys.length > 0) await redis.del(cacheKeys);

    res.json({ ok: true, message: "Account deleted" });
  } catch (error) {
    console.error("DELETE /api/account ERROR:", error);
    res.status(500).json({ error: "Account deletion failed" });
  }
});
