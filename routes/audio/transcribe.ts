import { Router, Request, Response } from "express";
import formidable from "formidable";
import { mkdir, stat } from "fs/promises";
import { join } from "path";
import { randomString } from "../../utils/general";

import { authenticateUser } from "../../middlewares/auth";
import { logError } from "../../config/firebaseAdmin";
import { transcribeWithFirework } from "../../utils/transcription";
const router = Router();

router.post(
  "/transcribe",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { files } = await parseForm(req);
      const file = Array.isArray(files.file) ? files.file[0] : files.file;

      if (!file) {
        return res.status(400).json({ error: "No audio file provided" });
      }
      console.time("TranscribeAudio");
      const { text } = await transcribeWithFirework({
        file: file.filepath,
      });
      console.timeEnd("TranscribeAudio");
      return res.status(200).json(text);
    } catch (error) {
      await logError(error as Error, {
        route: "/transcribe",
        userId: req.user?.uid,
        requestBody: req.body,
        timestamp: new Date().toISOString(),
      });
      console.error("Transcription error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
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
      `/uploads/audio`
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
      maxFiles: 1,
      maxFileSize: 25 * 1024 * 1024, // 25MB max
      uploadDir,
      filename: (_name, _ext, part) => {
        const filename = `${randomString()}.mp3`;
        return filename;
      },
    });

    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default router;
