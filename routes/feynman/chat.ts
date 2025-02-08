import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";
import { logError } from "../../config/firebaseAdmin";
import openai from "../../config/openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import FeynmanUsage from "../../models/feynman-usage";
import deepseek, { DEEPSEEK_MODEL } from "../../config/deepseek";
import fireworks, { FireworksModels } from "../../config/fireworks";

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
- Identify my knowledge gaps in my answer and ask me to clarify it.
- make sure that your question always relate to main topic ${topic}.
- Try to not repeat same question.

Only ask short question for each interaction. Max 30 words. 

End the conversation when the topic is clarify for you or when you have asked 7 questions. Speak casually. Use ${
      language || "English"
    } language. Like a friend.

Your response is a JSON of object:
- message
- is_done (conversation done)`;

    const openaiMessages = [
      { role: "user", content: FEYNMAN_PROMPT },
      ...messages,
    ];

    openaiMessages.push({ role: "user", content: new_message });

    const completion = await openai.chat.completions.create({
      model: "o3-mini",
      messages: openaiMessages as ChatCompletionMessageParam[],
      stream: false,
      reasoning_effort: "medium",
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No explanation generated");
    }

    const result = JSON.parse(content);

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

async function evaluateAnswer(question: string, answer: string, topic: string) {
  const completion = await fireworks.chat.completions.create({
    model: FireworksModels.LLAMA_V3P3_70B_INSTRUCT,
    messages: [
      {
        role: "system",
        content: `Evaluate the answer "${answer}" and determine if it is good answer to the question "${question}" for the topic "${topic}". If it good answer, return "true", otherwise ask a question to challenge that answer.`,
      },
    ],
  });

  return completion.choices[0].message.content;
}

export default router;
