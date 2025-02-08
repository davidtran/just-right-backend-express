import { Router, Request, Response } from "express";
import { authenticateUser } from "../../../middlewares/auth";
import { Note } from "../../../models/note";
import { logError } from "../../../config/firebaseAdmin";
import { getLanguageName } from "../../../utils/transcription";
import { translateWithGemini } from "../../../utils/note/note-processing";
import { redisClient } from "../../../config/redis";
import { NOTE_SESSION_KEY_PREFIX } from "../../../constants/constants";
import NoteQuestion from "../../../models/note-question";
import { shuffle } from "lodash";
import {
  cleanAndParseGeminiResponse,
  gemini15Flash,
} from "../../../config/gemini";

const router = Router();

router.post("/init", authenticateUser, async (req: Request, res: Response) => {
  try {
    const { userRecord } = req;

    if (!userRecord) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { note_id } = req.body;

    if (!note_id) {
      return res.status(400).json({ error: "Missing note_id" });
    }

    const note = await Note.findByPk(String(note_id));

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    if (note.user_id !== userRecord.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const sessionData = await buildSessionData(note);

    console.log(sessionData);

    // Prepare the Feynman teaching prompt
    let firstQuestion = sessionData[0].question;
    if (note.target_language && note.source_language !== note.target_language) {
      firstQuestion = await translateWithGemini(
        firstQuestion,
        getLanguageName(note.target_language)
      );
    }

    if (redisClient) {
      await redisClient.set(
        `${NOTE_SESSION_KEY_PREFIX}${note.id}`,
        JSON.stringify(sessionData)
      );
    }

    return res.json({
      message: firstQuestion,
    });
  } catch (error) {
    await logError(error as Error, {
      context: "/note/feynman/init",
      note_id: req.body.note_id,
    });
    return res.status(500).json({ error: "Internal server error" });
  }
});

async function buildSessionData(note: Note) {
  const questionList = await NoteQuestion.findAll({
    where: { note_id: note.id },
    limit: 3,
  });
  const rewriteQuestions = await rewriteQuestion(
    questionList.map((question) => question.question)
  );
  const questions = questionList.map((question, index) => ({
    question: rewriteQuestions[index],
    best_answer: question.best_answer,
  }));
  return shuffle(questions);
}

async function rewriteQuestion(questions: string[]): Promise<string[]> {
  const prompt = `Without explanation, rewrite the following questions but do not change the meaning: ${JSON.stringify(
    questions
  )}
Your response is a JSON object, use this format:
{
  "questions": ["question 1", "question 2", "question 3"]
}
`;
  const result = await gemini15Flash.generateContent({
    contents: [{ parts: [{ text: prompt }], role: "user" }],
  });
  const text = result.response.text();
  const json = cleanAndParseGeminiResponse(text);
  return json.questions;
}

export default router;
