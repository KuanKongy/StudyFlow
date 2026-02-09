import { MongoClient, ObjectId } from "mongodb";
import { createClient } from "redis";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const mongoUrl = process.env.MONGO_URL;
const redisUrl = process.env.REDIS_URL;

const mongo = new MongoClient(mongoUrl);
const redis = createClient({ url: redisUrl });

await mongo.connect();
await redis.connect();

const db = mongo.db();
const Jobs = db.collection("jobs");
const Notes = db.collection("notes");
const Flashcards = db.collection("flashcards");
const Users = db.collection("users");
const StudyMaterials = db.collection("studyMaterials");
const FlashcardSets = db.collection("flashcardSets");

await StudyMaterials.createIndex({ ownerId: 1 });
await StudyMaterials.createIndex({ topicId: 1 });
await StudyMaterials.createIndex({ type: 1 });
await Jobs.createIndex({ ownerId: 1 });
await Jobs.createIndex({ status: 1 });
await Flashcards.createIndex({ setId: 1 });

console.log("Worker connected to Mongo + Redis");

const MAX_RETRIES = 3;
let consecutive429s = 0;

async function callOpenAI(messages, temperature, job) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature,
    });
    consecutive429s = 0;
    return response;
  } catch (err) {
    if (err.status === 429) {
      consecutive429s++;
      const retries = (job.retries || 0) + 1;
      await Jobs.updateOne({ _id: job._id }, { $set: { retries } });

      // ai-002: trip circuit breaker after 3 consecutive 429s
      if (consecutive429s >= 3) {
        await redis.set("circuit-breaker:openai", "1", { EX: 60 });
        console.warn("Circuit breaker TRIPPED for OpenAI (60s cooldown)");
      }

      // ai-001: exponential backoff + re-queue
      if (retries < MAX_RETRIES) {
        await Jobs.updateOne({ _id: job._id }, { $set: { status: "retrying" } });
        const delay = Math.pow(2, retries) * 1000;
        console.log(`[ai-001] Re-queuing job ${job._id} after ${delay}ms (retry ${retries}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, delay));
        await redis.lPush("queue:jobs", JSON.stringify({ jobId: job._id.toString() }));
        return null;
      }
      await Jobs.updateOne(
        { _id: job._id },
        { $set: { status: "failed", error: `OpenAI rate limited after ${MAX_RETRIES} retries` } }
      );
      return null;
    }
    throw err;
  }
}

const handlers = {
  GENERATE_FLASHCARDS: handleGenerateFlashcards,
  GENERATE_SUMMARY: handleGenerateSummary,
};

while (true) {
  console.log("Worker waiting...");
  const job = await redis.brPop("queue:jobs", 0);
  if (!job) continue;

  const { jobId } = JSON.parse(job.element);
  console.log("Worker got job:", jobId);

  const jobObjectId = new ObjectId(jobId);
  const jobDoc = await Jobs.findOne({ _id: jobObjectId });
  if (!jobDoc) continue;

  // data-005: skip jobs for deleted users
  const userExists = await Users.findOne({ authId: jobDoc.ownerId });
  if (!userExists) {
    console.log(`Skipping job ${jobId} — user ${jobDoc.ownerId} deleted`);
    await Jobs.updateOne(
      { _id: jobDoc._id },
      { $set: { status: "failed", error: "User deleted" } }
    );
    continue;
  }

  const handler = handlers[jobDoc.type];
  if (!handler) {
    console.error(`Unknown job type: ${jobDoc.type}`);
    await Jobs.updateOne(
      { _id: jobDoc._id },
      { $set: { status: "failed", error: `Unknown job type: ${jobDoc.type}` } }
    );
    continue;
  }

  try {
    await handler(jobDoc);
  } catch (err) {
    console.error(err);
    await Jobs.updateOne(
      { _id: jobDoc._id },
      { $set: { status: "failed", error: err.message } }
    );
  }

  console.log("Job completed:", jobId);
}

async function handleGenerateFlashcards(job) {
  await Jobs.updateOne(
    { _id: job._id },
    { $set: { status: "processing", startedAt: Date.now() } }
  );

  const note = await Notes.findOne({ materialId: job.inputMaterialId });
  if (!note) {
    await Jobs.updateOne(
      { _id: job._id },
      { $set: { status: "failed", error: "Input note not found" } }
    );
    return;
  }

  if (note.content.length > 50_000) {
    await Jobs.updateOne(
      { _id: job._id },
      { $set: { status: "failed", error: "Note too large to summarize" } }
    );
    return;
  }

  const prompt = `
  You are an expert study assistant.
  
  Given the following study notes, generate 10 high-quality flashcards.
  
  Rules:
  - Return ONLY valid JSON
  - No markdown
  - No explanations
  - Questions should test understanding, not trivia
  
  JSON format:
  {
    "setTitle": "string",
    "cards": [
      { "q": "question", "a": "answer" }
    ]
  }
  
  Notes:
  ${note.content}
  `;

  const response = await callOpenAI(
    [
      { role: "system", content: "You generate flashcards for studying." },
      { role: "user", content: prompt },
    ],
    0.3,
    job
  );

  if (!response) return;

  let aiResult;
  try {
    aiResult = JSON.parse(response.choices[0].message.content);
  } catch {
    await Jobs.updateOne(
      { _id: job._id },
      { $set: { status: "failed", error: "Failed to parse AI output" } }
    );
    return;
  }

  if (!aiResult || !Array.isArray(aiResult.cards) || aiResult.cards.length === 0) {
    await Jobs.updateOne(
      { _id: job._id },
      { $set: { status: "failed", error: "Invalid AI output" } }
    );
    return;
  }

  const inputMaterial = await StudyMaterials.findOne({ _id: job.inputMaterialId });
  const { insertedId: materialId } = await StudyMaterials.insertOne({
    type: "flashcardSet",
    title: aiResult.setTitle,
    ownerId: job.ownerId,
    topicId: inputMaterial.topicId ?? null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const { insertedId: setId } = await FlashcardSets.insertOne({ materialId });

  await Flashcards.insertMany(
    aiResult.cards.map(card => ({
      setId,
      question: card.q,
      answer: card.a,
      createdAt: Date.now(),
    }))
  );

  if (inputMaterial?.topicId) {
    await redis.del(`topic:${inputMaterial.topicId.toString()}:materials`);
  }
  await redis.set(`job:${job._id.toString()}`, "done", { EX: 30 });

  await Jobs.updateOne(
    { _id: job._id },
    { $set: { status: "done", resultMaterialId: materialId, finishedAt: Date.now() } }
  );
}
