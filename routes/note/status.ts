import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";
import { Note } from "../../models/note";

const router = Router();

router.get("/status", async (req: Request, res: Response) => {
  const { note_id } = req.query;

  if (!note_id) {
    return res.status(400).json({ error: "Missing note_id" });
  }

  const note = await Note.findByPk(String(note_id));

  if (!note) {
    return res.status(404).json({ error: "Note not found" });
  }

  return res.status(200).json({ status: note.processing_status });
});

export default router;
