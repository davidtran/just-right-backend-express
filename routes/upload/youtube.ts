import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";
import axios from "axios";
import { TranscriptJSON, xmlToJson } from "../../utils/xmlToJson";
import { Note } from "../../models/note";
import { createNoteJob } from "../../queues/note-queue";
import { downloadAudio } from "../../utils/downloadFile";

const router = Router();

router.post(
  "/youtube",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { url, language } = req.body;
      const { userRecord } = req;

      if (!userRecord) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const note = await Note.create({
        user_id: userRecord.id,
        source_type: "youtube",
        target_language: language || "",
        resource_urls: [url],
      });

      createNoteJob({
        id: note.id,
        type: "youtube",
        youtubeUrl: url,
      });

      return res.status(200).json({ note_id: note.id });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch transcript" });
    }
  }
);

export default router;
