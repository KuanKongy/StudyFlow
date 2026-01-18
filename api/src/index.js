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

const db = mongo.db();
const Notes = db.collection("notes");
const Jobs = db.collection("jobs");
const Flashcards = db.collection("flashcards");
const Users = db.collection("users");
const StudyMaterials = db.collection("studyMaterials");
const FlashcardSets = db.collection("flashcardSets");
const Groups = db.collection("groups");
const Topics = db.collection("topics");

await StudyMaterials.createIndex({ ownerId: 1 });
await StudyMaterials.createIndex({ topicId: 1 });
await StudyMaterials.createIndex({ type: 1 });
await Jobs.createIndex({ ownerId: 1 });
await Jobs.createIndex({ status: 1 });
await Flashcards.createIndex({ setId: 1 });
await Groups.createIndex({ ownerId: 1 });
await Groups.createIndex({ memberIds: 1 });
await Topics.createIndex({ ownerId: 1 });
await Topics.createIndex({ groupId: 1 });

console.log("API connected to Mongo + Redis");

//Health Check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

//Test endpoint
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

//Test Auth
app.get("/api/private", (req, res) => {
  res.json({
    message: "You are authenticated!",
    user: req.auth.payload
  });
});

//MongoDB
//Auth User
app.get("/api/me", async (req, res) => {
  const authId = req.auth.payload.sub;

  let user = await Users.findOne({ authId });

  if (!user) {
    user = {
      authId,
      email: req.auth.payload.email,
      username: req.auth.payload.nickname ?? null,
      createdAt: Date.now(),
    };
    await Users.insertOne(user);
  }

  res.json(user);
});

//Create note
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

  const { insertedId: materialId } =
    await StudyMaterials.insertOne(material);

  await Notes.insertOne({
    materialId,
    content,
  });

  res.json({ materialId });
});

//Create flashcard job
app.post("/api/materials/:id/flashcards", async (req, res) => {
  const inputMaterialId = new ObjectId(req.params.id);

  const material = await StudyMaterials.findOne({ _id: inputMaterialId });
  if (!material || material.type !== "note") {
    return res.status(400).json({ error: "Invalid input material" });
  }

  const job = {
    type: "GENERATE_FLASHCARDS",
    inputMaterialId,
    ownerId: material.ownerId,
    status: "queued",
    createdAt: Date.now(),
  };

  const { insertedId } = await Jobs.insertOne(job);

  await redis.lPush(
    "queue:jobs",
    JSON.stringify({ jobId: insertedId.toString() })
  );

  res.json({ jobId: insertedId });
});

//Create summary job
app.post("/api/materials/:id/summary", async (req, res) => {
  const inputMaterialId = new ObjectId(req.params.id);

  const material = await StudyMaterials.findOne({ _id: inputMaterialId });
  if (!material || material.type !== "note") {
    return res.status(400).json({ error: "Invalid input material" });
  }

  const job = {
    type: "GENERATE_SUMMARY",
    inputMaterialId,
    ownerId: material.ownerId,
    status: "queued",
    createdAt: Date.now(),
  };

  const { insertedId } = await Jobs.insertOne(job);
  await redis.lPush("queue:jobs", JSON.stringify({ jobId: insertedId.toString() }));

  res.json({ jobId: insertedId });
});

//Get job status
app.get("/api/jobs/:id", async (req, res) => {
  const jobId = req.params.id;
  const cacheKey = `job:${jobId}`

  const cachedStatus = await redis.get(cacheKey);

  if (cachedStatus) {
    console.log(`[Redis] Status for ${jobId} from cache`);
    return res.json({ status: cachedStatus });
  }

  const job = await Jobs.findOne({ _id: new ObjectId(jobId) });
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  await redis.set(cacheKey, job.status, { Ex: 30});

  res.json({ status: job.status });
});

//Get all materials for a topic
app.get("/api/topics/:id/materials", async (req, res) => {
  const topicId = new ObjectId(req.params.id);
  const materials = await StudyMaterials
    .find({ topicId })
    .sort({ createdAt: -1 })
    .toArray();

  res.json(materials);
});

//Get material details (note OR flashcard set)
app.get("/api/materials/:id", async (req, res) => {
  const material = await StudyMaterials.findOne({
    _id: new ObjectId(req.params.id),
  });
  res.json(material);
});

//Get notes
app.get("/api/materials/:id/note", async (req, res) => {
  const note = await Notes.findOne({
    materialId: new ObjectId(req.params.id),
  });
  res.json(note);
});

//Update notes
// TODO: auth for updating
app.put("/api/materials/:id/note", async (req, res) => {
  try{
    const { title, content } = req.body;

    const material = await StudyMaterials.updateOne({
      _id: new ObjectId(req.params.id),
    }, {
      $set: {
        title: title,
        updatedAt: Date.now(),
      }
    })

    const note = await Notes.updateOne({
      materialId: req.params.id,
    }, {
      $set: {
        content: content,
      }
    })

    if (note.matchedCount === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json([note, material]);
  } catch (error) {
    console.error("PUT /materials/:id/note ERROR:", error);

    res.status(500).json({ error: "An internal server error occurred." });
  }

})

// delete notes, studyMaterials, or both
// TODO: auth for deleting
app.delete("/api/materials/:id/note", async (req, res) => {
  try {
    const materialId =  new ObjectId(req.params.id);
    const note = await Notes.deleteOne({materialId: materialId});
    const material = await StudyMaterials.deleteOne({_id: materialId});

    res.json([note, material]);

  } catch (error) {
    console.error("DEL /materials/:id/note ERROR:", error);

    res.status(500).json({ error: "An internal server error occurred." });
  }

})

//Get flashcard sets
app.get("/api/materials/:id/flashcard-set", async (req, res) => {
  const set = await FlashcardSets.findOne({
    materialId: new ObjectId(req.params.id),
  });
  res.json(set);
});

//Get flashcards
app.get("/api/flashcard-sets/:id/cards", async (req, res) => {
  const setId = new ObjectId(req.params.id);
  const cards = await Flashcards.find({ setId }).toArray();
  res.json(cards);
});

//Get all jobs for user
app.get("/api/jobs", async (req, res) => {
  const jobs = await Jobs
    .find({ ownerId: req.auth.payload.sub })
    .sort({ createdAt: -1 })
    .toArray();

  res.json(jobs);
});

// Get user by id
app.get("/api/users/:id", async (req, res) => {
  const user = await Users.findOne({ _id: new ObjectId(req.params.id) });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});
// TODO:? post user?
//TODO: update user
//TODO: delete user

//Groups
//Create group
//TODO: add join code in group schema
app.post("/api/groups", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });

  const group = {
    name,
    ownerId: req.auth.payload.sub,
    memberIds: [req.auth.payload.sub],
    createdAt: Date.now(),
  };

  const { insertedId } = await Groups.insertOne(group);
  res.json({ groupId: insertedId });
});
//Get group
app.get("/api/groups", async (req, res) => {
  const groups = await Groups
    .find({ memberIds: "dev-user" })
    .toArray();
  res.json(groups);
});

//Update group, will replace memberIds array with new array
app.put("/api/groups/:id", async (req, res) => {
  const { name, ownerId, memberIds } = req.body;
  const groupId = req.params.id;
  if (!name && !ownerId && !memberIds) return res.status(400).json({ error: "Need to include one of: name, owerId, or memberId" });

  const updateDoc = { $set: {} };
  if (name) updateDoc.$set.name = name;
  if (ownerId) updateDoc.$set.ownerId = ownerId;
  if (memberIds) updateDoc.$set.memberIds = memberIds;

  const result = await Groups.updateOne(
    { _id: new ObjectId(groupId) },
    updateDoc
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ error: "Group not found" });
  }
  
  res.json(result);
})
//Delete group
app.delete("/api/groups/:id", async (req, res) => {
  const groupId = req.params.id;

  const result = await Groups.deleteOne({ 
    _id: new ObjectId(groupId) 
  });

  if (result.deletedCount === 0) {
    return res.status(404).json({ error: "Group not found" });
  }

  res.json({ message: "Group deleted successfully", groupId });
})

//Add user
app.post("/api/groups/:id/members", async (req, res) => {
  const { userId } = req.body;

  await Groups.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $addToSet: { memberIds: userId } }
  );

  res.json({ ok: true });
});
//Remove user
app.delete("/api/groups/:id/members", async (req, res) => {
  const { userId } = req.body;

  await Groups.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $pull: { memberIds: userId } }
  );

  res.json({ ok: true });
});

//Topics
//Create topic
app.post("/api/topics", async (req, res) => {
  const { name, groupId } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const topic = {
    name,
    ownerId: req.auth.payload.sub,
    groupId: groupId ? new ObjectId(groupId) : null,
    createdAt: Date.now(),
  };

  const { insertedId } = await Topics.insertOne(topic);
  res.json({ topicId: insertedId });
});
//Get topic (user+groups)
app.get("/api/topics", async (req, res) => {
  const groups = await Groups.find({ memberIds: req.auth.payload.sub }).toArray();
  const groupIds = groups.map(g => g._id);

  const topics = await Topics.find({
    $or: [
      { ownerId: req.auth.payload.sub, groupId: null },
      { groupId: { $in: groupIds } }
    ]
  }).toArray();

  res.json(topics);
});

app.listen(4000, () => {
  console.log("API listening on 4000");
});
