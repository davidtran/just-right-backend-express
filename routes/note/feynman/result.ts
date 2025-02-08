import { Router, Request, Response } from "express";
import { authenticateUser } from "../../../middlewares/auth";
import FeynmanUsage from "../../../models/feynman-usage";
import { IChatMessage } from "../../../constants/interfaces";
import openai from "../../../config/openai";
import { logError } from "../../../config/firebaseAdmin";
import { Note } from "../../../models/note";
import { getLanguageName } from "../../../utils/transcription";
import { redisClient } from "../../../config/redis";
import { NOTE_SESSION_KEY_PREFIX } from "../../../constants/constants";

const router = Router();

router.post(
  "/result",
  authenticateUser,
  async (req: Request, res: Response) => {
    const { userRecord } = req;
    const { note_id, messages } = req.body;
    console.log(note_id, messages);

    if (!userRecord) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    if (!redisClient) {
      return res.status(400).json({
        error: "Redis client not found",
      });
    }

    const note = await Note.findByPk(String(note_id));

    if (!note) {
      return res.status(404).json({
        error: "Note not found",
      });
    }

    try {
      if (!userRecord.is_pro) {
        const feynmanUsage = await FeynmanUsage.findOne({
          where: {
            user_id: userRecord.id,
          },
        });
        if (feynmanUsage) {
          feynmanUsage.update({
            usage_count: feynmanUsage.usage_count + 1,
          });
        }
      }

      const chatMessages = messages as IChatMessage[];

      const locale = note.target_language || note.source_language || "en";
      const language = getLanguageName(locale);
      const rawSessionData = await redisClient.get(
        `${NOTE_SESSION_KEY_PREFIX}${note.id}`
      );
      const sessionData = JSON.parse(rawSessionData || "{}");
      const PROMPT = `
Read the the questions and my answers below and evaluate my understanding of the note: "${note.title.trim()}". 

Questions:
${sessionData
  .map(
    (question: any) =>
      `${question.question} - Best answer: ${question.best_answer}`
  )
  .join("\n")}

Messages:
${chatMessages
  .map((message) => `${message.role}: ${message.content}`)
  .join("\n")}
  
Your response is a JSON object with the following fields, please use ${language} language:
  - score: number (0-100)    
  - gaps: string[] (max 3 items - max 12 words each)
  - understood: string[] (max 5 items - max 12 words each)
`;
      console.log(PROMPT);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: PROMPT }],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        return res.status(400).json({
          error: "No content",
        });
      }

      console.log(content);

      const result = JSON.parse(content);
      res.status(200).json(result);
    } catch (error) {
      console.log(error);
      logError(error as Error, {
        route: "/feynman/result",
        user: userRecord?.id,
        messages,
      });
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

export default router;
