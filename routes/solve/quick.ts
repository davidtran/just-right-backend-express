import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";
import { logError } from "../../config/firebaseAdmin";
import { Question } from "../../models/question";
import {
  convertImageToTextWithGemini,
  parseExerciseContent,
  quickSolve,
} from "../../utils/solve";

const router = Router();

router.post("/quick", authenticateUser, async (req: Request, res: Response) => {
  try {
    const { userRecord } = req;
    const { question_id } = req.body;

    if (!userRecord) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!question_id) {
      return res.status(400).json({ error: "Missing question_id" });
    }

    // Get question from database
    const question = await Question.findByPk(question_id);
    if (!question || question.user_id !== userRecord.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (question.type === "photo") {
      const exerciseContent = await parseExerciseContent(question.question);
      question.question = exerciseContent.content;
      question.math = exerciseContent.is_math_exercise;
      question.direct_answer = exerciseContent.direct_answer;
    }

    const solution = await quickSolve(question);
    question.short_answer = solution;
    await question.save();

    return res.json({
      success: true,
      answer: solution,
      math: question.math,
      direct_answer: question.direct_answer,
    });
  } catch (error) {
    console.error(error);
    await logError(error as Error, {
      context: "/solve/solve",
      question_id: req.body.question_id,
    });
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
