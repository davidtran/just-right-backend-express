import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";
import FeynmanUsage from "../../models/feynman-usage";
import { IChatMessage } from "../../constants/interfaces";
import openai from "../../config/openai";
import { logError } from "../../config/firebaseAdmin";
import deepseek from "../../config/deepseek";
import {
  cleanAndParseGeminiResponse,
  gemini20Flash,
} from "../../config/gemini";
import { SchemaType } from "@google/generative-ai";

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
    Read the following messages and evaluate my understanding of the topic "${topic}". Please ignore spelling mistakes in the messages.
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

      const completion = await gemini20Flash.generateContent({
        contents: [{ parts: [{ text: PROMPT }], role: "user" }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              score: {
                type: SchemaType.NUMBER,
                description: "My understanding score of the topic",
              },
              gaps: {
                type: SchemaType.ARRAY,
                description: "The gaps in my understanding",
                items: {
                  type: SchemaType.STRING,
                },
              },
              understoods: {
                type: SchemaType.ARRAY,
                description: "What I understood about the topic",
                items: {
                  type: SchemaType.STRING,
                },
              },
            },
            required: ["score", "gaps", "understoods"],
          },
        },
      });

      const content = completion.response.text();

      console.log(content);
      if (!content) {
        return res.status(400).json({
          error: "No content",
        });
      }

      const result = cleanAndParseGeminiResponse(content);
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
