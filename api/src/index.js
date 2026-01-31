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

// ===================== Notes =====================

app.post("/api/notes", async (req, res) => {
  const { title, content, topicId } = req.body;
  if (!content || !title || !topicId) {
    return res.status(400).json({ error: "missing data required" });
  }
  const material = {
    type: "note",
    title,
    ownerId: req.auth.payload.sub,
    topicId: topicId ? new ObjectId(topicId) : null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const { insertedId: materialId } = await StudyMaterials.insertOne(material);
  await Notes.insertOne({ materialId, content });
  if (topicId) {
    await redis.del(`topic:${topicId}:materials`);
  }
  res.json({ materialId });
});

// AI job endpoints — gov-002 (amended): requires access to source note (ownership or group membership)
app.post("/api/materials/:id/flashcards", validateId, aiRateLimiter, aiCircuitBreaker, async (req, res) => {
  const inputMaterialId = new ObjectId(req.params.id);
  const material = await StudyMaterials.findOne({ _id: inputMaterialId });
  if (!material || material.type !== "note") {
    return res.status(400).json({ error: "Invalid input material" });
  }
  const allowed = await canAccessMaterial(material, req.auth.payload.sub);
  if (!allowed) {
    return res.status(403).json({ error: "Forbidden — you do not have access to this material" });
  }

  const job = {
    type: "GENERATE_FLASHCARDS",
    inputMaterialId,
    ownerId: req.auth.payload.sub,
    status: "queued",
    retries: 0,
    createdAt: Date.now(),
  };
  const { insertedId } = await Jobs.insertOne(job);
  await redis.lPush("queue:jobs", JSON.stringify({ jobId: insertedId.toString() }));
  res.json({ jobId: insertedId });
});

app.post("/api/materials/:id/summary", validateId, aiRateLimiter, aiCircuitBreaker, async (req, res) => {
  const inputMaterialId = new ObjectId(req.params.id);
  const material = await StudyMaterials.findOne({ _id: inputMaterialId });
  if (!material || material.type !== "note") {
    return res.status(400).json({ error: "Invalid input material" });
  }
  const allowed = await canAccessMaterial(material, req.auth.payload.sub);
  if (!allowed) {
    return res.status(403).json({ error: "Forbidden — you do not have access to this material" });
  }

  const job = {
    type: "GENERATE_SUMMARY",
    inputMaterialId,
    ownerId: req.auth.payload.sub,
    status: "queued",
    retries: 0,
    createdAt: Date.now(),
  };
  const { insertedId } = await Jobs.insertOne(job);
  await redis.lPush("queue:jobs", JSON.stringify({ jobId: insertedId.toString() }));
  res.json({ jobId: insertedId });
});

// ===================== Jobs =====================

app.get("/api/jobs/:id", async (req, res) => {
  const jobId = req.params.id;
  const cacheKey = `job:${jobId}`;
  const cachedStatus = await redis.get(cacheKey);
  if (cachedStatus) {
    return res.json({ status: cachedStatus });
  }
  const job = await Jobs.findOne({ _id: new ObjectId(jobId) });
  if (!job) return res.status(404).json({ error: "Job not found" });
  await redis.set(cacheKey, job.status, { EX: 30 });
  res.json({ status: job.status });
});

app.get("/api/jobs", async (req, res) => {
  const jobs = await Jobs
    .find({ ownerId: req.auth.payload.sub })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(jobs);
});

// ===================== Materials =====================

app.get("/api/materials", async (req, res) => {
  const userId = req.auth.payload.sub;
  const filter = req.query.filter || "all";

  try {
    let materials;
    if (filter === "mine") {
      materials = await StudyMaterials.find({ ownerId: userId }).sort({ updatedAt: -1 }).toArray();
    } else if (filter === "shared") {
      const userGroups = await Groups.find({ memberIds: userId }).toArray();
      const groupIds = userGroups.map(g => g._id);
      const sharedTopics = await Topics.find({ groupIds: { $elemMatch: { $in: groupIds } } }).toArray();
      const topicIds = sharedTopics.map(t => t._id);
      materials = await StudyMaterials.find({
        topicId: { $in: topicIds },
        ownerId: { $ne: userId },
      }).sort({ updatedAt: -1 }).toArray();
    } else {
      const ownMaterials = await StudyMaterials.find({ ownerId: userId }).sort({ updatedAt: -1 }).toArray();
      const userGroups = await Groups.find({ memberIds: userId }).toArray();
      const groupIds = userGroups.map(g => g._id);
      if (groupIds.length === 0) {
        materials = ownMaterials;
      } else {
        const sharedTopics = await Topics.find({ groupIds: { $elemMatch: { $in: groupIds } } }).toArray();
        const topicIds = sharedTopics.map(t => t._id);
        const sharedMaterials = await StudyMaterials.find({
          topicId: { $in: topicIds },
          ownerId: { $ne: userId },
        }).sort({ updatedAt: -1 }).toArray();
        const seen = new Set(ownMaterials.map(m => m._id.toString()));
        materials = [...ownMaterials];
        for (const m of sharedMaterials) {
          if (!seen.has(m._id.toString())) materials.push(m);
        }
      }
    }

    const result = materials.map(m => ({
      ...m,
      isOwner: m.ownerId === userId,
    }));
    res.json(result);
  } catch (error) {
    console.error("GET /api/materials error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/topics/:id/materials", async (req, res) => {
  const topicId = new ObjectId(req.params.id);
  const key = `topic:${topicId}:materials`;
  const cached = await redis.get(key);
  if (cached) return res.json(JSON.parse(cached));
  const materials = await StudyMaterials
    .find({ topicId })
    .sort({ createdAt: -1 })
    .toArray();
  await redis.set(key, JSON.stringify(materials), { EX: 600 });
  res.json(materials);
});

// auth-005 / gov-001: material access isolation
app.get("/api/materials/:id", validateId, async (req, res) => {
  const material = await StudyMaterials.findOne({ _id: new ObjectId(req.params.id) });
  if (!material) return res.status(404).json({ error: "Material not found" });
  const allowed = await canAccessMaterial(material, req.auth.payload.sub);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  res.json(material);
});

// auth-005 / gov-001: note access isolation
app.get("/api/materials/:id/note", validateId, async (req, res) => {
  const material = await StudyMaterials.findOne({ _id: new ObjectId(req.params.id) });
  if (!material) return res.status(404).json({ error: "Material not found" });
  const allowed = await canAccessMaterial(material, req.auth.payload.sub);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  const note = await Notes.findOne({ materialId: new ObjectId(req.params.id) });
  res.json(note);
});

app.put("/api/materials/:id/note", validateId, async (req, res) => {
  try {
    const { title, content } = req.body;
    const materialId = new ObjectId(req.params.id);
    const existing = await StudyMaterials.findOne({ _id: materialId });
    if (!existing) return res.status(404).json({ error: "Material not found" });
    const allowed = await canAccessMaterial(existing, req.auth.payload.sub);
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const material = await StudyMaterials.updateOne(
      { _id: materialId },
      { $set: { title, updatedAt: Date.now() } }
    );
    const note = await Notes.updateOne(
      { materialId },
      { $set: { content } }
    );
    if (note.matchedCount === 0) {
      return res.status(404).json({ error: "Note not found" });
    }
    const studyMaterial = await StudyMaterials.findOne({ _id: materialId });
    if (studyMaterial?.topicId) {
      await redis.del(`topic:${studyMaterial.topicId}:materials`);
    }
    res.json([note, material]);
  } catch (error) {
    console.error("PUT /materials/:id/note ERROR:", error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

app.delete("/api/materials/:id/note", validateId, async (req, res) => {
  try {
    const materialId = new ObjectId(req.params.id);
    const studyMaterial = await StudyMaterials.findOne({ _id: materialId });
    if (!studyMaterial) return res.status(404).json({ error: "Material not found" });
    if (studyMaterial.ownerId !== req.auth.payload.sub) {
      return res.status(403).json({ error: "Forbidden" });
    }
    // Cascade-delete derived summaries before removing the note
    const derivedSummaries = await StudyMaterials.find({
      derivedFrom: { $in: [materialId, materialId.toString()] },
      type: "summary"
    }).toArray();
    for (const s of derivedSummaries) {
      await deleteMaterialCascade(s._id);
    }
    const note = await Notes.deleteOne({ materialId });
    const material = await StudyMaterials.deleteOne({ _id: materialId });
    if (studyMaterial?.topicId) {
      await redis.del(`topic:${studyMaterial.topicId}:materials`);
    }
    res.json([note, material]);
  } catch (error) {
    console.error("DEL /materials/:id/note ERROR:", error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// ===================== Flashcard Sets & Cards =====================

app.post("/api/flashcard-sets", async (req, res) => {
  const { title, topicId, cards } = req.body;
  if (!title || !topicId) return res.status(400).json({ error: "title and topicId required" });
  const userId = req.auth.payload.sub;

  const material = {
    type: "flashcardSet",
    title,
    ownerId: userId,
    topicId: new ObjectId(topicId),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const { insertedId: materialId } = await StudyMaterials.insertOne(material);

  const flashcardSet = {
    materialId,
    createdAt: Date.now(),
  };
  const { insertedId: setId } = await FlashcardSets.insertOne(flashcardSet);

  if (cards && Array.isArray(cards) && cards.length > 0) {
    const cardDocs = cards.map(c => ({
      setId,
      question: c.question,
      answer: c.answer,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
    await Flashcards.insertMany(cardDocs);
  }

  await redis.del(`topic:${topicId}:materials`);
  res.json({ materialId, setId });
});

app.get("/api/materials/:id/flashcard-set", validateId, async (req, res) => {
  const set = await FlashcardSets.findOne({ materialId: new ObjectId(req.params.id) });
  res.json(set);
});

app.put("/api/materials/:id/flashcard-set", validateId, async (req, res) => {
  const flashcardsetId = new ObjectId(req.params.id);
  const { materialId } = req.body;
  if (!materialId) return res.status(400).json({ error: "Missing materialId" });
  const flashcardset = await FlashcardSets.updateOne(
    { _id: flashcardsetId },
    { $set: { materialId } }
  );
  res.json(flashcardset);
});

app.get("/api/flashcard-sets/:id/cards", async (req, res) => {
  const setId = req.params.id;
  const cacheKey = `set:${setId}:cards`;
  try {
    const cachedCards = await redis.get(cacheKey);
    if (cachedCards) return res.json(JSON.parse(cachedCards));
    const cards = await Flashcards.find({ setId: new ObjectId(setId) }).toArray();
    await redis.set(cacheKey, JSON.stringify(cards), { EX: 3600 });
    res.json(cards);
  } catch (error) {
    console.error("GET cards error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/materials/:id/cards", validateId, async (req, res) => {
  const { setId, question, answer } = req.body;
  const flashcardId = req.params.id;
  if (!setId && !question && !answer) return res.status(400).json({ error: "Need to include one of: setId, question, or answer" });
  const updateDoc = { $set: { updatedAt: Date.now() } };
  if (setId) updateDoc.$set.setId = setId;
  if (question) updateDoc.$set.question = question;
  if (answer) updateDoc.$set.answer = answer;
  const result = await Flashcards.updateOne({ _id: new ObjectId(flashcardId) }, updateDoc);
  if (result.matchedCount === 0) {
    return res.status(404).json({ error: "Flashcard not found" });
  }
  const flashcard = await Flashcards.findOne({ _id: new ObjectId(flashcardId) });
  if (flashcard?.setId) {
    await redis.del(`set:${flashcard.setId.toString()}:cards`);
    const flashcardSet = await FlashcardSets.findOne({ _id: new ObjectId(flashcard.setId) });
    if (flashcardSet?.topicId) {
      await redis.del(`topic:${flashcardSet.topicId}:materials`);
    }
  }
  res.json(result);
});

app.post("/api/flashcard-sets/:id/cards", async (req, res) => {
  const setId = req.params.id;
  const { question, answer } = req.body;
  if (!question || !answer) return res.status(400).json({ error: "question and answer required" });
  const set = await FlashcardSets.findOne({ _id: new ObjectId(setId) });
  if (!set) return res.status(404).json({ error: "Flashcard set not found" });
  const card = {
    setId: new ObjectId(setId),
    question,
    answer,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const { insertedId } = await Flashcards.insertOne(card);
  await redis.del(`set:${setId}:cards`);
  res.json({ _id: insertedId, ...card });
});

app.delete("/api/flashcards/:id", validateId, async (req, res) => {
  const cardId = req.params.id;
  const card = await Flashcards.findOne({ _id: new ObjectId(cardId) });
  if (!card) return res.status(404).json({ error: "Flashcard not found" });
  await Flashcards.deleteOne({ _id: new ObjectId(cardId) });
  if (card.setId) {
    await redis.del(`set:${card.setId.toString()}:cards`);
  }
  res.json({ ok: true });
});
