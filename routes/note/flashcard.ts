import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";
import { Note } from "../../models/note";
import NoteChunks from "../../models/note-chunk";
import { logError } from "../../config/firebaseAdmin";
import openai from "../../config/openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { Flashcard } from "../../models/flashcard";
import { gemini15Flash } from "../../config/gemini";

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
  console.time("generateFlashcardsFromNote");
  const messages = [
    {
      role: "system",
      content: `You are a flashcard generator. Create flashcards based on the provided content.
Your response is a JSON object - flashcards:
Example:
{
  "flashcards": [
    {
      "question": "The question text",
      "answer": "The concise answer",
    }
  ]
}`,
    },
    {
      role: "user",
      content: `Create flashcards from this content:\n\n${note.content}`,
    },
  ];

  const completion1 = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages as ChatCompletionMessageParam[],
    temperature: 0.7,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  let content = completion1.choices[0].message.content;
  console.time("generateFlashcardsFromNote");

  if (!content) {
    throw new Error("No content returned from OpenAI");
  }

  let flashcards = JSON.parse(content).flashcards;
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

  const response = await gemini15Flash.generateContent({
    contents: [
      {
        parts: [
          {
            text: `Translate this JSON array to ${
              note.target_language
            }. Return only the translated JSON object without any additional text or explanation.\n\n${JSON.stringify(
              quizzes
            )}
            
            Example output:
            [{"question": "TikTok không cắt đứt quan hệ với ByteDance sẽ phải đối mặt với những hậu quả gì?", "answers": ["Phạt tiền đối với các cửa hàng ứng dụng và nhà cung cấp Internet", "Mất dữ liệu người dùng", "Bị cấm khỏi các cửa hàng ứng dụng", "Tất cả các điều trên"], "correct_answer": 3}]`,
          },
        ],
        role: "user",
      },
    ],
    generationConfig: {
      temperature: 0.1,
    },
  });

  console.timeEnd("translateFlashcardArray");
  let text = response.response.text();
  if (text.startsWith("```json")) {
    text = text.split("\n")[1];
  }
  if (!text) {
    throw new Error("No content returned from Gemini");
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("Failed to parse Gemini response as JSON");
  }
}

async function translateFlashcard(note: Note, flashcard: any) {
  const response2 = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `Translate this JSON object to ${
          note.target_language
        } language: ${JSON.stringify(flashcard)}`,
      },
    ] as ChatCompletionMessageParam[],
    response_format: { type: "json_object" },
  });

  const content2 = response2.choices[0].message.content;

  if (!content2) {
    throw new Error("No content returned from OpenAI");
  }

  return JSON.parse(content2);
}

export default router;
