import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";
import formidable from "formidable";
import { mkdir, stat } from "fs/promises";
import { join } from "path";
import { randomString } from "../../utils/general";
import { logError } from "../../config/firebaseAdmin";
import { Note } from "../../models/note";
import { createNoteJob } from "../../queues/note-queue";

const router = Router();

router.post("/audio", authenticateUser, async (req: Request, res: Response) => {
  const { files, fields } = await parseForm(req);
  const { userRecord } = req;

  if (!userRecord) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const note = await Note.create({
      user_id: userRecord.id,
      source_type: "audio",
      target_language: fields.language ? String(fields.language) : "",
    });

    createNoteJob({
      id: note.id,
      type: "audio",
      audioPath: file.filepath,
    });

    return res.status(200).json({ note_id: note.id });
  } catch (error) {
    console.log(error);

    await logError(error as Error, {
      route: "/upload/audio",
      userId: userRecord.id,
    });

    return res.status(500).json({ error: "Failed to process audio" });
  }
});

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
      maxFileSize: 100 * 1024 * 1024, // 25MB max
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
