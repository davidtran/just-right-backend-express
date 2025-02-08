import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";
import { Note } from "../../models/note";
import { createNoteJob } from "../../queues/note-queue";
import { logError } from "../../config/firebaseAdmin";

const router = Router();

router.post(
  "/upload/text",
  authenticateUser,
  async (req: Request, res: Response) => {
    const { text, language } = req.body;
    const { userRecord } = req;

    if (!userRecord) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const note = await Note.create({
        user_id: userRecord.id,
        source_type: "text",
        target_language: language,
      });

      createNoteJob({
        id: note.id,
        resources: text,
      });

      return res.status(200).json({ note_id: note.id });
    } catch (error) {
      await logError(error as Error, {
        route: "/upload/text",
        userId: req.user?.id,
        text: req.body.text,
      });

      return res.status(500).json({ error: "Failed to process text" });
    }
  }
);
