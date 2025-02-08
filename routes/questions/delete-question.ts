import { Router } from "express";
import { Question } from "../../models/question";
import { authenticateUser } from "../../middlewares/auth";

const router = Router();

router.delete("/questions/delete", authenticateUser, async (req, res) => {
  const { user, userRecord } = req;
  if (!user) {
    return res.status(401).json({});
  }

  await Question.update(
    {
      is_deleted: true,
    },
    {
      where: { id: req.params.id, user_id: userRecord?.id },
    }
  );

  return res.status(200).json({});
});

export default router;
