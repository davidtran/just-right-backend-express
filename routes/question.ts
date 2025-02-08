import { Router, Request, Response } from "express";
import { RESPONSE_MESSAGES } from "../constants/constants";
import { Question } from "../models/question";
import { randomString } from "../utils/general";
import { parseQuestions } from "../utils/gpt";
import sequelize from "../config/database";

const router = Router();

router.post("/question", async (req: Request, res: Response) => {
  await sequelize.sync();
  const { question } = req.body;

  const questions = await parseQuestions(question);
  if (!questions) {
    return res.status(500).json({
      code: RESPONSE_MESSAGES.INVALID_QUESTION,
    });
  }

  const data = {
    content: question,
    type: "text",
    questions: JSON.stringify(questions),
    key: randomString(),
  };

  await Question.create(data);
  return res.status(200).json(data);
});

export default router;
