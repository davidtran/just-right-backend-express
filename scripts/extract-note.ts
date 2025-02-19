import dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../.env.local" });

import { Note } from "../models/note";
import NoteChunk from "../models/note-chunk";
import { NoteQuestion } from "../models/note-question";
import { Quiz } from "../models/quiz";
import { Flashcard } from "../models/flashcard";
import sequelize from "../config/database";

interface NoteData {
  note: Note;
  chunks: NoteChunk[];
  questions: NoteQuestion[];
  quizzes: Quiz[];
  flashcards: Flashcard[];
}

async function getNoteData(noteId: string): Promise<NoteData | null> {
  await sequelize.sync();
  try {
    // Fetch the note
    const note = await Note.findByPk(noteId);
    if (!note) {
      return null; // Note not found
    }

    // Fetch related data
    const [chunks, questions, quizzes, flashcards] = await Promise.all([
      NoteChunk.findAll({ where: { note_id: noteId } }),
      NoteQuestion.findAll({ where: { note_id: noteId } }),
      Quiz.findAll({ where: { note_id: noteId } }),
      Flashcard.findAll({ where: { note_id: noteId } }),
    ]);

    // Compile the data into a JSON object
    const noteData: NoteData = {
      note,
      chunks,
      questions,
      quizzes,
      flashcards,
    };

    return noteData;
  } catch (error) {
    console.error("Error fetching note data:", error);
    throw new Error("Failed to fetch note data");
  }
}

// Example usage
(async () => {
  const noteId = "05fa10fb-a523-427d-aafd-04bc95bcb498";
  const noteData = await getNoteData(noteId);
  if (noteData) {
    console.log(JSON.stringify(noteData, null, 2));
  } else {
    console.log("Note not found");
  }
})();
