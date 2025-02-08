import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";
import { logError } from "../../config/firebaseAdmin";

import { Note } from "../../models/note";
import { createNoteJob } from "../../queues/note-queue";

const router = Router();

router.post(
  "/website",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { url, language } = req.body;
      const { userRecord } = req;

      if (!userRecord) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!url || !isValidUrl(url)) {
        return res.status(400).json({
          error: "Please provide a valid URL",
        });
      }

      const note = await Note.create({
        user_id: userRecord.id,
        source_type: "website",
        resource_urls: [url],
        target_language: language,
      });

      createNoteJob({
        id: note.id,
        type: "website",
        websiteUrl: url,
      });

      return res.status(200).json({ note_id: note.id });
    } catch (error) {
      await logError(error as Error, {
        route: "/upload/website",
        userId: req.user?.id,
        url: req.body.url,
      });

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to process website content",
      });
    }
  }
);

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default router;
