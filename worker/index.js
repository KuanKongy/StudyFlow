import { MongoClient, ObjectId } from "mongodb";
import { createClient } from "redis";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
});

function log(level, msg, fields = {}) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level,
      service: "worker",
      msg,
      ...fields,
    })
  );
}

const mongoUrl = process.env.MONGO_URL;
const redisUrl = process.env.REDIS_URL;

const mongo = new MongoClient(mongoUrl);
const redis = createClient({
  url: redisUrl,
  // keep the connection alive so the provider doesn't idle-close it
  pingInterval: 60_000,
  socket: {
    reconnectStrategy: retries => Math.min(retries * 100, 3000),
  },
});

// without an error listener, a dropped socket becomes an unhandled
// 'error' event and kills the process
redis.on("error", err => log("error", "redis_error", { err: err?.message || String(err) }));
redis.on("reconnecting", () => log("warn", "redis_reconnecting"));
redis.on("ready", () => log("info", "redis_ready"));

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

log("info", "worker_connected");

const MAX_RETRIES = 3;
const openai429State = { consecutive429s: 0 };

async function callOpenAI(messages, temperature, job) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature
    });
    openai429State.consecutive429s = 0;
    return response;
  } catch (err) {
    if (err.status === 429) {
      openai429State.consecutive429s++;
      const retries = (job.retries || 0) + 1;
      await Jobs.updateOne({ _id: job._id }, { $set: { retries } });

      if (openai429State.consecutive429s >= 3) {
        await redis.set("circuit-breaker:openai", "1", { EX: 60 });
        log("warn", "circuit_breaker_tripped", { jobId: job._id?.toString?.() });
      }

      if (retries < MAX_RETRIES) {
        await Jobs.updateOne({ _id: job._id }, { $set: { status: "retrying" } });
        const delay = Math.pow(2, retries) * 1000;
        log("info", "openai_429_requeue", {
          jobId: job._id?.toString?.(),
          delayMs: delay,
          retries,
          maxRetries: MAX_RETRIES,
        });
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
  log("info", "worker_waiting");
  let job;
  try {
    // finite timeout: an infinite BRPOP pins the connection, blocking the
    // keep-alive pings and turning a dropped socket into a crashed loop
    job = await redis.brPop("queue:jobs", 30);
  } catch (err) {
    log("error", "queue_pop_error", { err: err?.message || String(err) });
    await new Promise(r => setTimeout(r, 1000));
    continue;
  }
  if (!job) continue;

  const { jobId } = JSON.parse(job.element);
  log("info", "job_received", { jobId });

  const jobObjectId = new ObjectId(jobId);
  const jobDoc = await Jobs.findOne({ _id: jobObjectId });
  if (!jobDoc) continue;

  // data-005: skip jobs for deleted users
  const userExists = await Users.findOne({ authId: jobDoc.ownerId });
  if (!userExists) {
    log("info", "job_skipped_user_deleted", { jobId, ownerId: jobDoc.ownerId });
    await Jobs.updateOne(
      { _id: jobDoc._id },
      { $set: { status: "failed", error: "User deleted" } }
    );
    continue;
  }

  const handler = handlers[jobDoc.type];
  if (!handler) {
    log("error", "unknown_job_type", { jobId, type: jobDoc.type });
    await Jobs.updateOne(
      { _id: jobDoc._id },
      { $set: { status: "failed", error: `Unknown job type: ${jobDoc.type}` } }
    );
    continue;
  }

  try {
    await handler(jobDoc);
  } catch (err) {
    log("error", "job_handler_error", {
      jobId,
      err: err?.message || String(err),
      requestId: jobDoc.requestId,
    });
    await Jobs.updateOne(
      { _id: jobDoc._id },
      { $set: { status: "failed", error: err.message } }
    );
  }

  log("info", "job_completed", { jobId, requestId: jobDoc.requestId });
}

async function handleGenerateFlashcards(job) {
  await Jobs.updateOne(
    { _id: job._id },
    { $set: { status: "processing", startedAt: Date.now() } }
  );
  log("info", "flashcards_job_processing", {
    jobId: job._id?.toString?.(),
    requestId: job.requestId,
    inputMaterialId: job.inputMaterialId?.toString?.(),
  });

  const note = await Notes.findOne({ materialId: job.inputMaterialId });
  if (!note) {
    await Jobs.updateOne(
      { _id: job._id },
      { $set: { status: "failed", error: "Input note not found" } }
    );
    return;
  }

  if (typeof note.content === "string" && note.content.length > 50_000) {
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

async function handleGenerateSummary(job) {
  try {
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

    if (typeof note.content === "string" && note.content.length > 50_000) {
      await Jobs.updateOne(
        { _id: job._id },
        { $set: { status: "failed", error: "Note too large to summarize" } }
      );
      return;
    }

    const response = await callOpenAI(
      [
        {
          role: "system",
          content:
            "You are an assistant that summarizes study notes. " +
            "You MUST only use information present in the input. " +
            "Do not add new facts. Preserve important terminology. Output valid Markdown.",
        },
        {
          role: "user",
          content: `
    Summarize the following study note into a concise, well-structured summary.
    Use headings and bullet points where appropriate.
    
    <NOTE>
    ${note.content}
    </NOTE>
          `,
        },
      ],
      0.2,
      job
    );

    if (!response) return;

    const summaryText = response.choices[0].message.content;

    const inputMaterial = await StudyMaterials.findOne({ _id: job.inputMaterialId });
    const { insertedId: materialId } = await StudyMaterials.insertOne({
      type: "summary",
      title: `Summary: ${inputMaterial.title}`,
      ownerId: job.ownerId,
      topicId: inputMaterial.topicId ?? null,
      derivedFrom: inputMaterial._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await Notes.insertOne({ materialId, content: summaryText });

    if (inputMaterial?.topicId) {
      await redis.del(`topic:${inputMaterial.topicId.toString()}:materials`);
    }
    await redis.set(`job:${job._id.toString()}`, "done", { EX: 30 });

    await Jobs.updateOne(
      { _id: job._id },
      { $set: { status: "done", resultMaterialId: materialId, finishedAt: Date.now() } }
    );
  } catch (err) {
    log("error", "summary_job_error", {
      jobId: job._id?.toString?.(),
      err: err?.message || String(err),
      requestId: job.requestId,
    });
    await Jobs.updateOne(
      { _id: job._id },
      { $set: { status: "failed", error: err.message } }
    );
  }
}
