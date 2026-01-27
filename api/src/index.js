import express from "express";
import { ObjectId } from "mongodb";
import { createClient } from "redis";
import { auth } from "express-oauth2-jwt-bearer";
import cors from "cors";
import dotenv from "dotenv";
import { validateId } from "./middleware/validateId.js";
import { mongoClient, redisClient, connectDB } from "./config/db.js";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`
});

const db = mongoClient.db();
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
app.param("id", validateId);

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
  if (user) {
    return res.json(user);
  }

  // Call Auth0 /userinfo ONCE
  const accessToken = req.headers.authorization.split(" ")[1];

  const userInfoRes = await fetch(
    `https://${process.env.AUTH0_DOMAIN}/userinfo`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!userInfoRes.ok) {
    return res.status(401).json({ error: "Failed to fetch user info" });
  }

  const userInfo = await userInfoRes.json();

  user = {
    authId,
    email: userInfo.email ?? null,
    username: userInfo.nickname ?? userInfo.name ?? null,
    picture: userInfo.picture ?? null,
    createdAt: Date.now(),
  };

  await Users.insertOne(user);

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

  if (topicId) {
    await redis.del(`topic:${topicId}:materials`);
  }

  res.json({ materialId });
});

//Create flashcard job
// worker must clear redis
app.post("/api/materials/:id/flashcards", validateId, async (req, res) => {
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
app.put("/api/materials/:id/note", async (req, res) => {
  try{
    const { title, content } = req.body;
    const materialId = new ObjectId(req.params.id);

    const material = await StudyMaterials.updateOne({
      _id: materialId,
    }, {
      $set: {
        title: title,
        updatedAt: Date.now(),
      }
    })

    const note = await Notes.updateOne({
      materialId: materialId,
    }, {
      $set: {
        content: content,
      }
    })

    if (note.matchedCount === 0) {
      return res.status(404).json({ error: "Note not found" });
    }
    // update the cache if study material has a topic
    const studyMaterial = await StudyMaterials.findOne({ _id: materialId})
    if (studyMaterial?.topicId) {
      await redis.del(`topic:${studyMaterial.topicId}:materials`);
    }
    

    res.json([note, material]);
  } catch (error) {
    console.error("PUT /materials/:id/note ERROR:", error);

    res.status(500).json({ error: "An internal server error occurred." });
  }

})

// delete notes, studyMaterials, or both
app.delete("/api/materials/:id/note", async (req, res) => {
  try {
    const materialId =  new ObjectId(req.params.id);
    const studyMaterial = await StudyMaterials.findOne({ _id: materialId})

    const note = await Notes.deleteOne({materialId: materialId});
    const material = await StudyMaterials.deleteOne({_id: materialId});

    if (studyMaterial?.topicId) {
      await redis.del(`topic:${studyMaterial.topicId}:materials`);
    }

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

app.put("/api/materials/:id/flashcard-set", async (req, res) => {
  const flashcardsetId =  new ObjectId(req.params.id);

  const { materialId } = req.body;
  if (!materialId ) return res.status(400).json({ error: "Missing materialId" });

  const flashcardset = await FlashcardSets.updateOne({
    _id: flashcardsetId
  }, {
    $set: {
      materialId: materialId,
    }
  })

  res.json(flashcardset);
});

//Get flashcards
app.get("/api/flashcard-sets/:id/cards", async (req, res) => {
  const setId = req.params.id;
  const cacheKey = `set:${setId}:cards`;

  try {
    const cachedCards = await redis.get(cacheKey);
    if (cachedCards) {
      return res.json(JSON.parse(cachedCards));
    }

    const cards = await Flashcards.find({ 
      setId: new ObjectId(setId) 
    }).toArray();

    await redis.set(cacheKey, JSON.stringify(cards), { EX: 3600 });

    res.json(cards);
  } catch (error) {
    console.error("GET cards error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/materials/:id/cards", async (req, res) => {
  const { setId, question, answer } = req.body;
  const flashcardId = req.params.id;
  if (!setId && !question && !answer) return res.status(400).json({ error: "Need to include one of: setId, question, or answer" });

  const updateDoc = { $set: {} };
  if (setId) updateDoc.$set.setId = setId;
  if (question) updateDoc.$set.question = question;
  if (answer) updateDoc.$set.answer = answer;
  updateDoc.$set.updatedAt = Date.now();

  const result = await Flashcards.updateOne(
    { _id: new ObjectId(flashcardId) },
    updateDoc
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ error: "Flashcard not found" });
  }

  const flashcard = await Flashcards.findOne({_id: new ObjectId(flashcardId)})
  if (flashcard && flashcard?.setId) {
    await redis.del(`set:${flashcard.setId.toString()}:cards`);
    const flashcardSet = await FlashcardSets.findOne({_id: new ObjectId(flashcard.setId)});
    if (flashcardSet && flashcardSet?.topicId) {
      await redis.del(`topic:${flashcardSet.topicId}:materials`);
    }
  }
  
  res.json(result);
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
    updatedAt: Date.now(),
  };

  const { insertedId } = await Groups.insertOne(group);
  res.json({ groupId: insertedId });
});
//Get group
app.get("/api/groups", async (req, res) => {
  const groups = await Groups
    .find({ memberIds: req.auth.payload.sub })
    .toArray();
  res.json(groups);
});

//Update group, will replace memberIds array with new array
app.put("/api/groups/:id", async (req, res) => {
  const { name, ownerId, memberIds } = req.body;
  const groupId = req.params.id;
  if (!name && !ownerId && !memberIds) return res.status(400).json({ error: "Need to include one of: name, ownerId, or memberId" });

  const updateDoc = { $set: {} };
  if (name) updateDoc.$set.name = name;
  if (ownerId) updateDoc.$set.ownerId = ownerId;
  if (memberIds) updateDoc.$set.memberIds = memberIds;
  updateDoc.$set.updatedAt = Date.now();

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
//TODO: make it so only owner can delete
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
//TODO: make it so that only own can remove
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
  const { title, groupId, description } = req.body;
  if (!title) return res.status(400).json({ error: "title required" });
  const topic = {
    title,
    ownerId: req.auth.payload.sub,
    description: description ? description : "",
    groupId: groupId ? new ObjectId(groupId) : null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
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
//Update topic
app.put("/api/topics/:id", async (req, res) => {
  const { title, description, ownerId, groupId } = req.body;
  const topicId = req.params.id;
  if (!title && !description && !ownerId && !groupId) return res.status(400).json({ error: "Need to include one of: title, description, or ownerId" });

  const updateDoc = { $set: { updatedAt: Date.now() } };
  if (title) updateDoc.$set.title = title;
  if (description) updateDoc.$set.description = description;
  if (ownerId) updateDoc.$set.ownerId = ownerId;
  if (groupId) updateDoc.$set.groupId = groupId;
  updateDoc.$set.updatedAt = Date.now();

  const result = await Topics.updateOne(
    { _id: new ObjectId(topicId) },
    updateDoc,
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ error: "Topic not found" });
  }
  
  res.json(result);
});
//Delete topic
app.delete("/api/topics/:id", async (req, res) => {
  const topicId = req.params.id;

  const result = await Topics.deleteOne({ 
    _id: new ObjectId(topicId) 
  });

  if (result.deletedCount === 0) {
    return res.status(404).json({ error: "Topic not found" });
  }

  res.json({ message: "Topic deleted successfully", topicId });
})

app.listen(4000, () => {
  console.log("API listening on 4000");
});
