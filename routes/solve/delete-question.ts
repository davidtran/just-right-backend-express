import { Router } from "express";
import { authenticateUser } from "../../middlewares/auth";
import { Question } from "../../models/question";

const router = Router();

router.delete("/delete-question/:id", authenticateUser, async (req, res) => {
  const { id } = req.params;
  const userRecord = req.userRecord;

  if (!userRecord) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const question = await Question.findByPk(id);

  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  if (question.user_id !== userRecord.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  await question.update({
    is_deleted: true,
  });
  res.status(200).json({ message: "Question deleted" });
});

export default router;
