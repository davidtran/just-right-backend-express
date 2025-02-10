import { Router, Request, Response } from "express";
import { Note } from "../../models/note";
import { authenticateUser } from "../../middlewares/auth";
import { logError } from "../../config/firebaseAdmin";
import { Op } from "sequelize";

const router = Router();

router.get("/list", authenticateUser, async (req: Request, res: Response) => {
  const { userRecord } = req;
  const { q } = req.query as { q: string };
  if (!userRecord) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const whereClause: any = {
      user_id: userRecord.id,
      is_deleted: false,
      processing_status: {
        [Op.not]: "failed",
      },
    };
    if (q) {
      whereClause.title = {
        [Op.iLike]: `%${q}%`,
      };
    }
    const notes = await Note.findAll({
      where: whereClause,
      order: [["created_at", "DESC"]],
    });

    const uploadCount = await Note.count({
      where: {
        user_id: userRecord.id,
        is_sample: false,
      },
    });

    return res.status(200).json({
      notes: notes.map((note) => {
        return {
          id: note.id,
          title: note.title,
          source_type: note.source_type,
          summary: note.summary,
          created_at: note.createdAt,
          processing_status: note.processing_status,
          is_sample: note.is_sample,
        };
      }),
      uploadCount,
    });
  } catch (error) {
    console.error(error);
    logError(error as Error, {
      route: "/note/list",
      user_id: userRecord.id,
    });
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
