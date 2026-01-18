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

const handlers = {
  GENERATE_FLASHCARDS: handleGenerateFlashcards,
  GENERATE_SUMMARY: handleGenerateSummary,
};

while (true) {
  console.log("Worker waiting...");
  const job = await redis.brPop("queue:jobs", 0);
  if (!job) continue;

  const { jobId } = JSON.parse(job.element); //   const payload = JSON.parse(job.element);
  console.log("Worker got job:", jobId);

  const jobObjectId = new ObjectId(jobId);

  const jobDoc = await Jobs.findOne({ _id: jobObjectId });
  if (!jobDoc) continue;

  const handler = handlers[jobDoc.type];
  if (!handler) {
    throw new Error(`Unknown job type: ${jobDoc.type}`);
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

//Flashcard generation
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

  // AI call
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
  
  let aiResult;
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You generate flashcards for studying." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    });
  
    aiResult = JSON.parse(response.choices[0].message.content);
  } catch (err) {
    await Jobs.updateOne(
      { _id: job._id },
      { $set: { status: "failed", error: "AI generation failed" } }
    );
    throw err;
  }

  if (
    !aiResult ||
    !Array.isArray(aiResult.cards) ||
    aiResult.cards.length === 0
  ) {
    await Jobs.updateOne(
      { _id: job._id },
      { $set: { status: "failed", error: "Invalid AI output" } }
    );
    return;
  }

  //Create StudyMaterial
  const inputMaterial = await StudyMaterials.findOne({
    _id: job.inputMaterialId,
  });
  const { insertedId: materialId } =
    await StudyMaterials.insertOne({
      type: "flashcardSet",
      title: aiResult.setTitle,
      ownerId: job.ownerId,
      topicId: inputMaterial.topicId ?? null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

  //Create FlashcardSet
  const { insertedId: setId } =
    await FlashcardSets.insertOne({ materialId });

  //Insert flashcards
  await Flashcards.insertMany(
    aiResult.cards.map(card => ({
      setId,
      question: card.q,
      answer: card.a,
      createdAt: Date.now(),
    }))
  );

  //Update job
  await Jobs.updateOne(
    { _id: job._id },
    {
      $set: {
        status: "done",
        resultMaterialId: materialId,
        finishedAt: Date.now(),
      },
    }
  );
}

//Generate summary
//TODO: error handling
async function handleGenerateSummary(job) {
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

  // AI call
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini", // cheap + good for summarization
    messages: [
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
    temperature: 0.2, // low = factual, stable
  });
  
  const summaryText = completion.choices[0].message.content;

  //Insert summary (appears as note)
  const inputMaterial = await StudyMaterials.findOne({
    _id: job.inputMaterialId,
  });
  const { insertedId: materialId } =
    await StudyMaterials.insertOne({
      type: "summary",
      title: `Summary: ${inputMaterial.title}`,
      ownerId: job.ownerId,
      topicId: inputMaterial.topicId ?? null,
      derivedFrom: inputMaterial._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  await Notes.insertOne({
    materialId,
    content: summaryText,
  });

  //Update job
  await Jobs.updateOne(
    { _id: job._id },
    {
      $set: {
        status: "done",
        resultMaterialId: materialId,
        finishedAt: Date.now(),
      },
    }
  );
}
