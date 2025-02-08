import { Router, Request, Response } from "express";
import { Question } from "../models/question";
import * as GPT from "../utils/gpt";
import { User } from "../models/user";

const router = Router();

enum QueryType {
  QuickAnswer = "QuickAnswer",
  DetailAnswer = "DetailAnswer",
}

router.post("/query-v2", async (req: Request, res: Response) => {
  const { queryType, photoKey, userId } = req.body;

  if (![QueryType.QuickAnswer, QueryType.DetailAnswer].includes(queryType)) {
    return res.status(404).json({});
  }

  const userRecord = await User.findOne({
    where: { id: userId },
  });

  const photo = await Question.findOne({
    where: { key: photoKey },
  });

  if (!photo) {
    return res.status(404).json({});
  }

  try {
    if (queryType === QueryType.QuickAnswer) {
      const answer = await GPT.getQuickAnswer(photo, userRecord);

      if (answer) {
        photo.short_answer = answer.trim();
        await photo.save();
        return res.status(200).json({ answer });
      }

      return res.status(500).json({
        content: "Unable to answer this question",
      });
    }

    if (photo.short_answer) {
      const answer = await GPT.getDetailAnswer(photo, userRecord);

      if (answer) {
        photo.detail_answer = answer.trim();
        await photo.save();
        return res.status(200).json({ answer });
      }

      return res.status(500).json({
        content: "Unable to answer this question",
      });
    }
  } catch (e) {
    console.log(JSON.stringify(e, null, 2));
    return res.status(500).json({
      content: "Unable to answer this question",
    });
  }
});

export default router;
