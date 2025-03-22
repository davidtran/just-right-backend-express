import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";
import formidable from "formidable";
import { mkdir, stat, readFile } from "fs/promises";
import { join } from "path";
import { randomString } from "../../utils/general";
import { logError } from "../../config/firebaseAdmin";
import { Note } from "../../models/note";
import { createNoteJob } from "../../queues/note-queue";

const router = Router();

router.post("/pdf", authenticateUser, async (req: Request, res: Response) => {
  try {
    const { files, fields } = await parseForm(req);
    const { userRecord } = req;

    if (!userRecord) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!files.file) {
      return res.status(400).json({ error: "No PDF file provided" });
    }

    const pdfFiles = Array.isArray(files.file) ? files.file : [files.file];

    if (pdfFiles.length > 1) {
      return res.status(400).json({
        error: "Maximum 1 PDF files allowed per request",
      });
    }

    const pdf = pdfFiles[0];

    // enqueue to create note job
    const note = await Note.create({
      user_id: userRecord.id,
      source_type: "pdf",
      target_language: fields.language ? String(fields.language) : "",
    });

    createNoteJob({
      id: note.id,
      type: "pdf",
      pdfPath: pdf.filepath,
    });

    return res.status(200).json({ note_id: note.id });
  } catch (error) {
    console.log(error);
    await logError(error as Error, {
      route: "/upload/pdf",
      userId: req.user?.id,
    });

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to process PDF",
    });
  }
});

async function parseForm(
  req: Request
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise(async (resolve, reject) => {
    const uploadDir = join(
      process.env.ROOT_DIR || process.cwd(),
      "/uploads/pdf"
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
      maxFileSize: 10 * 1024 * 1024, // 32MB max per file
      uploadDir,
      filename: (_name, _ext, part) => {
        return `${randomString()}.pdf`;
      },
      filter: (part) => {
        return part.mimetype === "application/pdf";
      },
    });

    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default router;
