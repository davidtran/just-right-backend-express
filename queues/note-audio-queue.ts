import dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../.env.local" });

import Queue from "bee-queue";
import { Note } from "../models/note";
import { NoteAudio } from "../models/note-audio";
import { processNoteToAudio } from "../utils/azure-tts";
import { logError } from "../config/firebaseAdmin";
import { convertMarkdownToSpeechText } from "../utils/markdown-to-speech-text";

const noteAudioQueue = new Queue("note-audio-queue", {
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times: number) => {
      return Math.min(times * 50, 2000); // exponential backoff with max delay of 2s
    },
  },
});

noteAudioQueue.on("ready", () => {
  console.log("Note audio queue is ready");
});

noteAudioQueue.process(5, async (job: any, done: any) => {
  console.log(`Processing audio job ${job.id} for note ${job.data.noteId}`);

  try {
    // Find the note and note audio records
    const note = await Note.findByPk(job.data.noteId);
    const noteAudio = await NoteAudio.findByPk(job.data.noteAudioId);

    if (!note || !noteAudio) {
      throw new Error("Note or NoteAudio not found");
    }

    // Update status to processing
    //noteAudio.status = "processing";
    await noteAudio.save();

    // Determine the language to use
    const language = note.target_language || note.source_language || "en";

    // Convert markdown to speech-friendly text
    const speechText = await convertMarkdownToSpeechText(
      note.summary,
      note.content,
      language
    );

    // Store the speech text in the note audio record
    noteAudio.audio_content = speechText;
    await noteAudio.save();

    // Process the note summary to generate audio
    const { fileUrl, durationSeconds } = await processNoteToAudio(
      speechText,
      language
    );

    // Update the note audio record
    noteAudio.file_url = fileUrl;
    noteAudio.status = "completed";
    noteAudio.duration_seconds = durationSeconds;
    noteAudio.last_generated_at = new Date();
    await noteAudio.save();

    console.log(`Successfully processed audio for note ${note.id}`);
    done(null, { success: true, noteAudioId: noteAudio.id });
  } catch (error) {
    console.error("Error processing note audio:", error);

    // Try to update the note audio status to error
    try {
      const noteAudio = await NoteAudio.findByPk(job.data.noteAudioId);
      if (noteAudio) {
        noteAudio.status = "error";
        noteAudio.error_message =
          error instanceof Error ? error.message : "Unknown error";
        await noteAudio.save();
      }
    } catch (updateError) {
      console.error("Error updating note audio status:", updateError);
    }

    // Log the error
    logError(new Error("note-audio-processing"), {
      noteId: job.data.noteId,
      noteAudioId: job.data.noteAudioId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    done(error);
  }
});

export const createNoteAudioJob = async (
  noteId: string
): Promise<NoteAudio> => {
  try {
    // Find the note
    const note = await Note.findByPk(noteId);
    if (!note) {
      throw new Error(`Note with ID ${noteId} not found`);
    }

    // Check if there's already a note audio record
    let noteAudio = await NoteAudio.findOne({
      where: { note_id: noteId },
    });

    // If not, create a new one
    if (!noteAudio) {
      const language = note.target_language || note.source_language || "en";

      noteAudio = await NoteAudio.create({
        note_id: noteId,
        status: "pending",
        language,
      });
    } else if (noteAudio.status === "error") {
      // If previous attempt failed, reset status
      noteAudio.status = "pending";
      noteAudio.error_message = "";
      await noteAudio.save();
    }

    // Create a job in the queue
    const job = noteAudioQueue.createJob({
      noteId,
      noteAudioId: noteAudio.id,
    });

    await job.save();
    console.log(`Created note audio job ${job.id} for note ${noteId}`);

    return noteAudio;
  } catch (error) {
    console.error("Error creating note audio job:", error);
    throw error;
  }
};

export default noteAudioQueue;
