import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";
import { Note } from "../../models/note";
import { logError } from "../../config/firebaseAdmin";
import { Quiz } from "../../models/quiz";
import {
  generateQuiz,
  generateQuizWithGemini,
  shuffleQuizAnswers,
} from "../../utils/note/quiz-generator";

const router = Router();

router.get("/quiz", authenticateUser, async (req: Request, res: Response) => {
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

    const quizs = await Quiz.findAll({
      where: { note_id },
    });

    if (quizs.length > 0) {
      const questions = quizs.map((q) => ({
        ...q.toJSON(),
        answers: q.answers.slice(0, 4),
        correct_answer: Number(q.correct_answer),
      }));
      return res.json({
        questions: shuffleQuizAnswers(questions),
        total: quizs.length,
      });
    }

    const questions = await generateQuizWithGemini(note);
    await Promise.all(
      questions.map((q: any) => Quiz.create({ ...q, note_id }))
    );
    return res.status(200).json({
      questions: shuffleQuizAnswers(questions),
      total: questions.length,
    });
  } catch (error) {
    console.log(error);
    await logError(error as Error, {
      context: "/note/quiz",
      note_id: req.body.note_id,
    });
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
