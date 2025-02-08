import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";
import formidable from "formidable";
import { mkdir, stat } from "fs/promises";
import { join } from "path";
import { randomString } from "../../utils/general";
import { logError } from "../../config/firebaseAdmin";
import { createNoteJob } from "../../queues/note-queue";
import { Note } from "../../models/note";

const router = Router();

router.post(
  "/images",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { files, fields } = await parseForm(req);
      const { userRecord } = req;

      if (!userRecord) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!files.images) {
        return res.status(400).json({ error: "No images provided" });
      }

      const imageFiles = Array.isArray(files.images)
        ? files.images
        : [files.images];

      if (imageFiles.length > 10) {
        return res
          .status(400)
          .json({ error: "Maximum 10 images allowed per request" });
      }

      // enqueue to create note job
      const note = await Note.create({
        user_id: userRecord.id,
        source_type: "images",
        target_language: String(fields.target_language),
      });

      createNoteJob({
        id: note.id,
        type: "images",
        images: imageFiles.map((file) => file.filepath),
      });

      return res.status(200).json({ note_id: note.id });
    } catch (error) {
      await logError(error as Error, {
        route: "/upload/images",
        userId: req.user?.id,
      });

      return res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to upload images",
      });
    }
  }
);

async function parseForm(
  req: Request
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise(async (resolve, reject) => {
    const uploadDir = join(
      process.env.ROOT_DIR || process.cwd(),
      "/uploads/images"
    );

    try {
      await stat(uploadDir);
    } catch (e: any) {
      if (e.code === "ENOENT") {
        await mkdir(uploadDir, { recursive: true });
      } else {
        reject(e);
        return;
      }
    }

    const form = formidable({
      maxFiles: 10,
      maxFileSize: 10 * 1024 * 1024, // 10MB max per file
      uploadDir,
      filename: (_name, _ext, part) => {
        const ext = part.mimetype?.split("/")[1] || "jpg";
        return `${randomString()}.${ext}`;
      },
      filter: (part) => {
        return part.mimetype?.startsWith("image/") || false;
      },
    });

    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default router;
