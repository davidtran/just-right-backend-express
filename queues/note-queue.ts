import dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../.env.local" });

import Queue from "bee-queue";
import { Note } from "../models/note";
import { preprocessAudioNote } from "./note-handlers/audio-handler";
import { logError } from "../config/firebaseAdmin";
import { preprocessYoutubeNote } from "./note-handlers/youtube-handler";
import { preprocessImageNote } from "./note-handlers/image-handler";
import { getLanguageName } from "../utils/transcription";
import { preprocessPdfNote } from "./note-handlers/pdf-handler";
import { preprocessTextNote } from "./note-handlers/text-handler";
import {
  extractNoteKeyQuestions,
  extractNoteTitle,
  generateBookSummary,
  generateNoteChunks,
  generateNoteSummaryWithGemini,
  translateWithGemini,
} from "../utils/note/note-processing";
import { preprocessWebsiteNote } from "./note-handlers/website-handler";
import NoteChunk from "../models/note-chunk";
import NoteQuestion from "../models/note-question";

const noteQueue = new Queue("note-queue", {
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times: number) => {
      return Math.min(times * 50, 2000); // exponential backoff with max delay of 2s
    },
  },
});

noteQueue.on("ready", () => {
  console.log("Note queue is ready");
});

noteQueue.process(10, async (job: any, done: any) => {
  console.log("receive job", job.data);
  console.log(`Processing job ${job.id}`);

  const note = await Note.findByPk(job.data.id);

  if (!note) {
    done(new Error("Note not found"));
    return;
  }

  try {
    await processJob(note, job.data.type, job);
    done();
  } catch (error) {
    console.log(error);
    note.processing_status = "failed";
    await note.save();
    logError(error as Error, {
      jobId: job.id,
      noteId: job.data.id,
      type: job.data.type,
    });
    done(error);
  }
});

export const createNoteJob = (job: any) => {
  console.log("jobs", job);
  noteQueue.createJob(job).save();
};

async function processJob(note: Note, type: string, job: any) {
  await preprocessNote(note, type, job);
  await postprocessNote(note, type, job);
  await generateAndSaveNoteChunks(note);
}

async function preprocessNote(note: Note, type: string, job: any) {
  switch (type) {
    case "audio": {
      return preprocessAudioNote(note, job.data.audioPath);
    }
    case "youtube": {
      return preprocessYoutubeNote(note, job.data.youtubeUrl);
    }
    case "images": {
      return preprocessImageNote(note, job.data.images);
    }
    case "pdf": {
      return preprocessPdfNote(note, job.data.pdfPath);
    }
    case "text": {
      return preprocessTextNote(note, job.data.text);
    }
    case "website": {
      return preprocessWebsiteNote(note, job.data.websiteUrl);
    }
    default: {
      throw new Error("Invalid job type");
    }
  }
}

async function postprocessNote(note: Note, type: string, files: string[]) {
  let summary = await getNoteSummary(note, type);
  if (summary.startsWith("```markdown")) {
    summary = summary.slice(9).trim();
  }
  if (summary.endsWith("```")) {
    summary = summary.slice(0, -3).trim();
  }

  if (!note.title) {
    const title = extractNoteTitle(summary);
    note.title = title || "";
  }
  note.summary = summary || "";
  note.original_summary = summary || "";
  //note.embedding = embedding;

  if (note.target_language && note.source_language !== note.target_language) {
    console.time("translateText");
    const translationResults = await Promise.all([
      translateWithGemini(
        note.title || "",
        getLanguageName(note.target_language)
      ),
      translateWithGemini(
        note.summary || "",
        getLanguageName(note.target_language)
      ),
    ]);
    note.title = translationResults[0] || "";
    note.summary = translationResults[1] || "";
    note.original_summary = note.summary;
    console.timeEnd("translateText");
  }

  const keyQuestions = await extractNoteKeyQuestions(note);
  await Promise.all(
    keyQuestions.map((question) =>
      NoteQuestion.create({
        note_id: note.id,
        question: question.question,
        best_answer: question.best_answer,
        explanation: question.explanation,
        importance: question.importance,
      })
    )
  );

  note.processing_status = "completed";
  await note.save();
}

async function generateAndSaveNoteChunks(note: Note) {
  console.time("generateNoteChunks");
  const { chunks, embeddings } = await generateNoteChunks(note.content);
  await Promise.all(
    chunks.map((chunk, index) =>
      NoteChunk.create({
        note_id: note.id,
        content: chunk,
        embedding: embeddings[index],
        chunk_index: index,
      })
    )
  );
  console.timeEnd("generateNoteChunks");
}

function getNoteSummary(note: Note, type: string) {
  switch (type) {
    case "pdf": {
      return generateBookSummary(note.content);
    }
    default: {
      return generateNoteSummaryWithGemini(note.content);
    }
  }
}
