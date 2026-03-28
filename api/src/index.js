import express from "express";
import { randomUUID } from "node:crypto";
import { MongoClient, ObjectId } from "mongodb";
import { createClient } from "redis";
import { auth } from "express-oauth2-jwt-bearer";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

function log(level, msg, fields = {}) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level,
      service: "api",
      msg,
      ...fields,
    })
  );
}

const app = express();
app.use(cors());
app.use((req, res, next) => {
  const id = req.headers["x-request-id"] || randomUUID();
  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
});
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

log("info", "api_connected");

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
    log("error", "rate_limiter_error", { err: err?.message || String(err) });
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
    log("error", "circuit_breaker_check_error", { err: err?.message || String(err) });
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
  } catch { /* /userinfo unavailable — use fallback */ }

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
      } catch { /* skip malformed entries */ }
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
    log("error", "delete_account_error", {
      requestId: req.requestId,
      err: error?.message || String(error),
    });
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
    requestId: req.requestId,
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
    requestId: req.requestId,
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
    log("error", "get_materials_error", {
      requestId: req.requestId,
      err: error?.message || String(error),
    });
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
    log("error", "put_note_error", {
      requestId: req.requestId,
      err: error?.message || String(error),
    });
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
    log("error", "delete_note_error", {
      requestId: req.requestId,
      err: error?.message || String(error),
    });
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
    log("error", "get_cards_error", {
      requestId: req.requestId,
      err: error?.message || String(error),
    });
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

// ===================== Groups =====================

app.post("/api/groups", async (req, res) => {
  const { name, joinCode, description } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const group = {
    name,
    description: description || "",
    joinCode: joinCode || null,
    ownerId: req.auth.payload.sub,
    memberIds: [req.auth.payload.sub],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const { insertedId } = await Groups.insertOne(group);
  res.json({ groupId: insertedId, ...group, _id: insertedId });
});

app.get("/api/groups", async (req, res) => {
  const groups = await Groups
    .find({ memberIds: req.auth.payload.sub })
    .toArray();
  res.json(groups);
});

// Browse joinable groups (for JoinGroup page)
app.get("/api/groups/available", async (req, res) => {
  const groups = await Groups
    .find({
      memberIds: { $ne: req.auth.payload.sub },
      $or: [{ joinCode: null }, { joinCode: { $exists: false } }]
    })
    .toArray();
  res.json(groups);
});

// Join group by code
app.post("/api/groups/join", async (req, res) => {
  const { joinCode } = req.body;
  if (!joinCode) return res.status(400).json({ error: "joinCode required" });
  const group = await Groups.findOne({ joinCode });
  if (!group) return res.status(404).json({ error: "Invalid join code" });
  if (group.memberIds.includes(req.auth.payload.sub)) {
    return res.json({ ok: true, message: "Already a member", group });
  }
  await Groups.updateOne(
    { _id: group._id },
    { $addToSet: { memberIds: req.auth.payload.sub } }
  );
  await GroupAuditLog.insertOne({
    groupId: group._id,
    actorId: req.auth.payload.sub,
    targetId: req.auth.payload.sub,
    action: "join",
    timestamp: Date.now(),
  });
  const updated = await Groups.findOne({ _id: group._id });
  res.json({ ok: true, group: updated });
});

app.put("/api/groups/:id", validateId, async (req, res) => {
  const { name, description, joinCode, ownerId, memberIds, avatar } = req.body;
  const groupId = req.params.id;
  const updateDoc = { $set: { updatedAt: Date.now() } };
  if (name) updateDoc.$set.name = name;
  if (description !== undefined) updateDoc.$set.description = description;
  if (avatar !== undefined) updateDoc.$set.avatar = avatar;
  if (joinCode !== undefined) updateDoc.$set.joinCode = joinCode || null;
  if (ownerId) updateDoc.$set.ownerId = ownerId;
  if (memberIds) updateDoc.$set.memberIds = memberIds;
  if (Object.keys(updateDoc.$set).length <= 1) {
    return res.status(400).json({ error: "No update fields provided" });
  }
  const result = await Groups.updateOne({ _id: new ObjectId(groupId) }, updateDoc);
  if (result.matchedCount === 0) {
    return res.status(404).json({ error: "Group not found" });
  }
  const updated = await Groups.findOne({ _id: new ObjectId(groupId) });
  res.json(updated);
});

// auth-002: only owner can delete group
app.delete("/api/groups/:id", validateId, async (req, res) => {
  const groupId = req.params.id;
  const groupOid = new ObjectId(groupId);
  const group = await Groups.findOne({ _id: groupOid });
  if (!group) return res.status(404).json({ error: "Group not found" });
  if (group.ownerId !== req.auth.payload.sub) {
    return res.status(403).json({ error: "Forbidden — only the group owner can delete this group" });
  }
  await Topics.updateMany({ groupIds: groupOid }, { $pull: { groupIds: groupOid } });
  await Groups.deleteOne({ _id: groupOid });
  res.json({ message: "Group deleted successfully", groupId });
});

// Add member + gov-005 audit log
app.post("/api/groups/:id/members", validateId, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });
  await Groups.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $addToSet: { memberIds: userId } }
  );
  await GroupAuditLog.insertOne({
    groupId: new ObjectId(req.params.id),
    actorId: req.auth.payload.sub,
    targetId: userId,
    action: "add",
    timestamp: Date.now(),
  });
  res.json({ ok: true });
});

async function handleMemberRemovalCascade(groupId, userId) {
  const groupOid = new ObjectId(groupId);

  // Topics owned by the removed user: detach from this group
  await Topics.updateMany(
    { ownerId: userId, groupIds: groupOid },
    { $pull: { groupIds: groupOid } }
  );

  // In those (now-detached) topics, delete materials NOT owned by the removed user
  const detachedTopics = await Topics.find({ ownerId: userId }).toArray();
  for (const t of detachedTopics) {
    const foreignMats = await StudyMaterials.find({
      topicId: t._id,
      ownerId: { $ne: userId }
    }).toArray();
    for (const m of foreignMats) {
      await deleteMaterialCascade(m._id);
    }
  }

  // Topics NOT owned by the removed user that remain in this group: delete the removed user's materials
  const groupTopics = await Topics.find({
    groupIds: groupOid,
    ownerId: { $ne: userId }
  }).toArray();
  for (const t of groupTopics) {
    const userMats = await StudyMaterials.find({
      topicId: t._id,
      ownerId: userId
    }).toArray();
    for (const m of userMats) {
      await deleteMaterialCascade(m._id);
    }
  }
}

// auth-003: only owner can remove members (or member can remove self) + gov-005 audit log
app.delete("/api/groups/:id/members", validateId, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const group = await Groups.findOne({ _id: new ObjectId(req.params.id) });
  if (!group) return res.status(404).json({ error: "Group not found" });
  const isSelfRemoval = userId === req.auth.payload.sub;
  if (!isSelfRemoval && group.ownerId !== req.auth.payload.sub) {
    return res.status(403).json({ error: "Forbidden — only the group owner can remove members" });
  }
  if (userId === group.ownerId) {
    return res.status(400).json({ error: "The group owner cannot be removed" });
  }
  await Groups.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $pull: { memberIds: userId } }
  );
  await handleMemberRemovalCascade(req.params.id, userId);
  await GroupAuditLog.insertOne({
    groupId: new ObjectId(req.params.id),
    actorId: req.auth.payload.sub,
    targetId: userId,
    action: isSelfRemoval ? "leave" : "remove",
    timestamp: Date.now(),
  });
  res.json({ ok: true });
});

// Leave group (member removes self)
app.post("/api/groups/:id/leave", validateId, async (req, res) => {
  const userId = req.auth.payload.sub;
  const group = await Groups.findOne({ _id: new ObjectId(req.params.id) });
  if (!group) return res.status(404).json({ error: "Group not found" });
  if (group.ownerId === userId) {
    return res.status(400).json({ error: "The group owner cannot leave. Delete the group or transfer ownership." });
  }
  if (!group.memberIds.includes(userId)) {
    return res.status(400).json({ error: "You are not a member of this group" });
  }
  await Groups.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $pull: { memberIds: userId } }
  );
  await handleMemberRemovalCascade(req.params.id, userId);
  await GroupAuditLog.insertOne({
    groupId: new ObjectId(req.params.id),
    actorId: userId,
    targetId: userId,
    action: "leave",
    timestamp: Date.now(),
  });
  res.json({ ok: true });
});

// ===================== Topics (groupIds array) =====================

app.post("/api/topics", async (req, res) => {
  const { title, groupId, groupIds, description } = req.body;
  if (!title) return res.status(400).json({ error: "title required" });

  let resolvedGroupIds = [];
  if (groupIds && Array.isArray(groupIds)) {
    resolvedGroupIds = groupIds.map(id => new ObjectId(id));
  } else if (groupId) {
    resolvedGroupIds = [new ObjectId(groupId)];
  }

  const topic = {
    title,
    ownerId: req.auth.payload.sub,
    description: description || "",
    groupIds: resolvedGroupIds,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const { insertedId } = await Topics.insertOne(topic);
  res.json({ topicId: insertedId, ...topic, _id: insertedId });
});

app.get("/api/topics", async (req, res) => {
  const groups = await Groups.find({ memberIds: req.auth.payload.sub }).toArray();
  const userGroupIds = groups.map(g => g._id);

  const topics = await Topics.find({
    $or: [
      { ownerId: req.auth.payload.sub, groupIds: { $size: 0 } },
      { ownerId: req.auth.payload.sub, groupIds: { $exists: false } },
      { groupIds: { $elemMatch: { $in: userGroupIds } } }
    ]
  }).toArray();
  res.json(topics);
});

app.put("/api/topics/:id", validateId, async (req, res) => {
  const { title, description, ownerId, groupId, groupIds } = req.body;
  const topicId = req.params.id;
  const updateDoc = { $set: { updatedAt: Date.now() } };
  if (title) updateDoc.$set.title = title;
  if (description !== undefined) updateDoc.$set.description = description;
  if (ownerId) updateDoc.$set.ownerId = ownerId;
  if (groupIds && Array.isArray(groupIds)) {
    updateDoc.$set.groupIds = groupIds.map(id => new ObjectId(id));
  } else if (groupId) {
    updateDoc.$set.groupIds = [new ObjectId(groupId)];
  }
  const result = await Topics.updateOne({ _id: new ObjectId(topicId) }, updateDoc);
  if (result.matchedCount === 0) {
    return res.status(404).json({ error: "Topic not found" });
  }
  const updated = await Topics.findOne({ _id: new ObjectId(topicId) });
  res.json(updated);
});

app.delete("/api/topics/:id", validateId, async (req, res) => {
  const topicId = req.params.id;
  const topicOid = new ObjectId(topicId);
  const topic = await Topics.findOne({ _id: topicOid });
  if (!topic) return res.status(404).json({ error: "Topic not found" });
  if (topic.ownerId !== req.auth.payload.sub) {
    return res.status(403).json({ error: "Forbidden — only the topic owner can delete this topic" });
  }
  const materials = await StudyMaterials.find({ topicId: topicOid }).toArray();
  const materialIds = materials.map(m => m._id);
  if (materialIds.length > 0) {
    const sets = await FlashcardSets.find({ materialId: { $in: materialIds } }).toArray();
    const setIds = sets.map(s => s._id);
    if (setIds.length > 0) await Flashcards.deleteMany({ setId: { $in: setIds } });
    await FlashcardSets.deleteMany({ materialId: { $in: materialIds } });
    await Notes.deleteMany({ materialId: { $in: materialIds } });
    await StudyMaterials.deleteMany({ topicId: topicOid });
    await redis.del(`topic:${topicId}:materials`);
  }
  await Topics.deleteOne({ _id: topicOid });
  await redis.del(`topic:${topicId}:materials`);
  res.json({ message: "Topic and all materials deleted successfully", topicId });
});

app.post("/api/topics/batch-delete", async (req, res) => {
  const { topicIds } = req.body;
  if (!topicIds || !Array.isArray(topicIds) || topicIds.length === 0) {
    return res.status(400).json({ error: "topicIds array required" });
  }
  const userId = req.auth.payload.sub;
  let deleted = 0;
  for (const id of topicIds) {
    try {
      const topicOid = new ObjectId(id);
      const topic = await Topics.findOne({ _id: topicOid });
      if (!topic || topic.ownerId !== userId) continue;
      const materials = await StudyMaterials.find({ topicId: topicOid }).toArray();
      const materialIds = materials.map(m => m._id);
      if (materialIds.length > 0) {
        const sets = await FlashcardSets.find({ materialId: { $in: materialIds } }).toArray();
        const setIds = sets.map(s => s._id);
        if (setIds.length > 0) await Flashcards.deleteMany({ setId: { $in: setIds } });
        await FlashcardSets.deleteMany({ materialId: { $in: materialIds } });
        await Notes.deleteMany({ materialId: { $in: materialIds } });
        await StudyMaterials.deleteMany({ topicId: topicOid });
        await redis.del(`topic:${id}:materials`);
      }
      await Topics.deleteOne({ _id: topicOid });
      await redis.del(`topic:${id}:materials`);
      deleted++;
    } catch (e) {
      log("error", "batch_delete_topic_error", {
        requestId: req.requestId,
        topicId: id,
        err: e?.message || String(e),
      });
    }
  }
  res.json({ deleted });
});

// ===================== Generic Material Deletion =====================

async function deleteMaterialCascade(materialId) {
  const material = await StudyMaterials.findOne({ _id: materialId });
  if (!material) return false;
  if (material.type === "note") {
    await Notes.deleteMany({ materialId });
    // Cascade-delete summaries derived from this note
    const derivedSummaries = await StudyMaterials.find({
      derivedFrom: { $in: [materialId, materialId.toString()] },
      type: "summary"
    }).toArray();
    for (const s of derivedSummaries) {
      await deleteMaterialCascade(s._id);
    }
  } else if (material.type === "flashcardSet") {
    const sets = await FlashcardSets.find({ materialId }).toArray();
    const setIds = sets.map(s => s._id);
    if (setIds.length > 0) await Flashcards.deleteMany({ setId: { $in: setIds } });
    await FlashcardSets.deleteMany({ materialId });
  } else if (material.type === "summary") {
    await Notes.deleteMany({ materialId });
  }
  await StudyMaterials.deleteOne({ _id: materialId });
  if (material.topicId) {
    await redis.del(`topic:${material.topicId}:materials`);
  }
  return true;
}

app.delete("/api/materials/:id", validateId, async (req, res) => {
  try {
    const materialId = new ObjectId(req.params.id);
    const material = await StudyMaterials.findOne({ _id: materialId });
    if (!material) return res.status(404).json({ error: "Material not found" });
    if (material.ownerId !== req.auth.payload.sub) {
      return res.status(403).json({ error: "Forbidden — only the owner can delete this material" });
    }
    await deleteMaterialCascade(materialId);
    res.json({ ok: true });
  } catch (error) {
    log("error", "delete_material_error", {
      requestId: req.requestId,
      err: error?.message || String(error),
    });
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/materials/batch-delete", async (req, res) => {
  const { materialIds } = req.body;
  if (!materialIds || !Array.isArray(materialIds) || materialIds.length === 0) {
    return res.status(400).json({ error: "materialIds array required" });
  }
  const userId = req.auth.payload.sub;
  let deleted = 0;
  let skipped = 0;
  for (const id of materialIds) {
    if (!ObjectId.isValid(id)) { skipped++; continue; }
    const material = await StudyMaterials.findOne({ _id: new ObjectId(id) });
    if (!material || material.ownerId !== userId) { skipped++; continue; }
    await deleteMaterialCascade(new ObjectId(id));
    deleted++;
  }
  res.json({ ok: true, deleted, skipped });
});

app.listen(4000, () => {
  log("info", "api_listening", { port: 4000 });
});
