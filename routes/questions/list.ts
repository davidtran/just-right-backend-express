import { Router } from "express";
import { Question } from "../../models/question";
import { authenticateUser } from "../../middlewares/auth";

const router = Router();

router.get("/questions/list", authenticateUser, async (req, res) => {
  const { user, userRecord } = req;
  if (!user) {
    return res.status(401).json({});
  }

  const questionArray = await Question.findAll({
    where: {
      user_id: userRecord?.id,
      is_deleted: false,
    },
    order: [["created_at", "DESC"]],
  });

  return res.status(200).json({
    questions: questionArray,
  });
});

export default router;
