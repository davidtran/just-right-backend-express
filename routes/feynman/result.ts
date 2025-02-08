import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";
import FeynmanUsage from "../../models/feynman-usage";
import { IChatMessage } from "../../constants/interfaces";
import openai from "../../config/openai";
import { logError } from "../../config/firebaseAdmin";
import deepseek from "../../config/deepseek";

const router = Router();

router.post(
  "/result",
  authenticateUser,
  async (req: Request, res: Response) => {
    const { userRecord } = req;
    const { topic, messages, language } = req.body;

    if (!userRecord) {
      return res.status(401).json({
        error: "Unauthorized",
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

      const PROMPT = `
    Read the following messages and evaluate my understanding of the topic "${topic}". 
    ${chatMessages
      .map((message) => `${message.role}: ${message.content}`)
      .join("\n")}
  
    Your response is a JSON object with the following fields, please return in ${
      language || "English"
    }:
    - score: number (0-100)    
    - gaps: string[]
    - understoods: string[]
`;

      const completion = await openai.chat.completions.create({
        model: "o3-mini",
        messages: [{ role: "user", content: PROMPT }],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        return res.status(400).json({
          error: "No content",
        });
      }

      const result = JSON.parse(content);
      res.status(200).json(result);
    } catch (error) {
      console.log(error);
      logError(error as Error, {
        route: "/feynman/result",
        user: userRecord?.id,
        topic,
        messages,
      });
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

export default router;
