import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";
import { logError } from "../../config/firebaseAdmin";
import openai from "../../config/openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import FeynmanUsage from "../../models/feynman-usage";
import deepseek, { DEEPSEEK_MODEL } from "../../config/deepseek";
import fireworks, { FireworksModels } from "../../config/fireworks";
import {
  cleanAndParseGeminiResponse,
  gemini20Flash,
} from "../../config/gemini";
import { SchemaType } from "@google/generative-ai";

const router = Router();

interface FeynmanRequest {
  topic: string;
  messages: { role: string; content: string }[];
  new_message: string;
  language: string;
}

router.post("/chat", authenticateUser, async (req: Request, res: Response) => {
  try {
    const { topic, messages, new_message, language } =
      req.body as FeynmanRequest;
    const { userRecord } = req;

    if (!userRecord) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    if (!topic) {
      return res.status(400).json({
        error: "Topic is required",
      });
    }

    const FEYNMAN_PROMPT = `You are speaking with me about topic "${topic}". Don't ask complicated question, just enough to challenge my understanding of ${topic}.

For each message from me, you must:
- evaluate the answer to make sure it relate to the topic, challenge me if my answer doesn't correct.
- Identify my knowledge gaps and ask me to clarify it.
- make sure that your question always relate to main topic ${topic}.
- Try to not repeat same question.

Always ask a short question for after each interaction. Max 30 words. 

End the conversation when the topic is clarify for you or when you have asked 7 questions. Speak casually. Use ${
      language || "English"
    } language. Like a friend.

Your response is a JSON of object:
- message
- is_done (conversation done)`;

    const openaiMessages = [
      { role: "developer", content: FEYNMAN_PROMPT },
      ...messages,
    ];

    openaiMessages.push({ role: "user", content: new_message });

    const completion = await gemini20Flash.generateContent({
      contents: messages.map((message) => ({
        parts: [{ text: message.content }],
        role: message.role === "user" ? "user" : "model",
      })),
      systemInstruction: FEYNMAN_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          description: "Chat response",
          type: SchemaType.OBJECT,
          properties: {
            message: {
              type: SchemaType.STRING,
              description: "Chat message",
              nullable: false,
            },
            is_done: {
              type: SchemaType.BOOLEAN,
              description: "Conversation done",
              nullable: false,
            },
          },
          required: ["message", "is_done"],
        },
      },
    });

    const content = completion.response.text();

    console.log(content);

    if (!content) {
      throw new Error("No explanation generated");
    }

    const result = cleanAndParseGeminiResponse(content);

    return res.status(200).json(result);
  } catch (error) {
    await logError(error as Error, {
      route: "/feynman/chat",
      userId: req.user?.id,
      topic: req.body.topic,
      messages: req.body.messages,
      new_message: req.body.new_message,
    });

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate explanation",
    });
  }
});

export default router;
