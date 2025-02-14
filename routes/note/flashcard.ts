import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";
import { Note } from "../../models/note";
import { logError } from "../../config/firebaseAdmin";
import { Flashcard } from "../../models/flashcard";
import {
  cleanAndParseGeminiResponse,
  gemini15Flash,
  gemini20Flash,
} from "../../config/gemini";
import NoteQuestion from "../../models/note-question";
import { SchemaType } from "@google/generative-ai";
import { getLanguageName } from "../../utils/transcription";

interface FlashcardItem {
  question: string;
  answer: string;
  explanation: string;
}

const router = Router();

router.get(
  "/flashcards",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { userRecord } = req;
      const { note_id } = req.query;

      if (!userRecord) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!note_id) {
        return res.status(400).json({ error: "Missing note_id" });
      }

      // Verify note ownership
      const note = await Note.findByPk(String(note_id));
      if (!note || note.user_id !== userRecord.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Check if flashcards already exist
      const flashcards = await Flashcard.findAll({
        where: { note_id },
      });

      if (flashcards.length > 0) {
        return res.json({
          flashcards: flashcards.map((item) => item.toJSON()),
          total: flashcards.length,
        });
      }

      const generatedFlashcards = await generateFlashcardsFromNote(note);

      return res.json({
        flashcards: generatedFlashcards.map((item) => item.toJSON()),
        total: generatedFlashcards.length,
      });
    } catch (error) {
      console.log(error);
      await logError(error as Error, {
        context: "/note/flashcard",
        note_id: req.query.note_id,
      });
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

async function generateFlashcardsFromNote(note: Note) {
  let questions = await NoteQuestion.findAll({
    where: { note_id: note.id },
  });
  let flashcards = questions.map((question) => ({
    question: question.question,
    answer: question.best_answer,
  }));
  if (note.target_language && note.target_language !== note.source_language) {
    const translatedFlashcards = await translateFlashcardArray(
      note,
      flashcards
    );
    flashcards = translatedFlashcards;
  }

  const results = await Promise.all(
    flashcards.map((flashcard: any) =>
      Flashcard.create({
        note_id: note.id,
        front: flashcard.question,
        back: flashcard.answer,
      })
    )
  );

  return results;
}

async function translateFlashcardArray(note: Note, quizzes: any[]) {
  console.time("translateFlashcardArray");
  const prompt = `Translate this JSON array to ${getLanguageName(
    note.target_language
  )}: ${JSON.stringify(quizzes)}
  
Return only the translated JSON array without any additional text or explanation, example:
[{"question": string, "answer": string}]`;
  console.log(prompt);
  const response = await gemini20Flash.generateContent({
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
        role: "user",
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        description: "Flashcards",
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            question: { type: SchemaType.STRING },
            answer: { type: SchemaType.STRING },
          },
          required: ["question", "answer"],
        },
      },
    },
  });

  console.timeEnd("translateFlashcardArray");

  let text = response.response.text();
  console.log(text);
  const json = cleanAndParseGeminiResponse(text);
  return json;
}

export default router;
