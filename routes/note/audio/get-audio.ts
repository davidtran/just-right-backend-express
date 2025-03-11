import { Request, Response } from "express";
import { Note } from "../../../models/note";
import { NoteAudio } from "../../../models/note-audio";
import { createNoteAudioJob } from "../../../queues/note-audio-queue";

export const getAudio = async (req: Request, res: Response) => {
  try {
    console.log("getAudio", req.params, req.query);
    const { noteId } = req.params;

    // Validate noteId
    if (!noteId) {
      return res.status(400).json({ error: "Note ID is required" });
    }

    // Find the note
    const note = await Note.findByPk(noteId);
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    // Check if note has a summary
    if (!note.summary || note.summary.trim() === "") {
      return res
        .status(400)
        .json({ error: "Note has no summary to convert to audio" });
    }

    // Find existing note audio or create a new job
    let noteAudio = await NoteAudio.findOne({
      where: { note_id: noteId },
    });

    // If no audio exists yet, create a new job
    if (!noteAudio) {
      noteAudio = await createNoteAudioJob(noteId);
      return res.status(202).json({
        status: "pending",
        message: "Audio generation has been queued",
        noteAudioId: noteAudio.id,
      });
    }

    console.log(note.summary);

    // Check the status of the audio
    switch (noteAudio.status) {
      case "completed":
        // Return the audio file URL
        return res.status(200).json({
          status: "completed",
          file_url: noteAudio.file_url,
          duration_seconds: noteAudio.duration_seconds,
          language: noteAudio.language,
          last_generated_at: noteAudio.last_generated_at,
        });

      case "pending":
      case "processing":
        // Audio is being processed
        return res.status(202).json({
          status: noteAudio.status,
          message: `Audio generation is ${noteAudio.status}`,
          noteAudioId: noteAudio.id,
        });

      case "error":
        // There was an error, create a new job
        noteAudio = await createNoteAudioJob(noteId);
        return res.status(202).json({
          status: "pending",
          message:
            "Previous attempt failed. Audio generation has been requeued.",
          noteAudioId: noteAudio.id,
          previous_error: noteAudio.error_message,
        });

      default:
        // Unknown status, create a new job
        noteAudio = await createNoteAudioJob(noteId);
        return res.status(202).json({
          status: "pending",
          message: "Audio generation has been queued",
          noteAudioId: noteAudio.id,
        });
    }
  } catch (error) {
    console.error("Error getting note audio:", error);
    return res.status(500).json({
      error: "Failed to process audio request",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
