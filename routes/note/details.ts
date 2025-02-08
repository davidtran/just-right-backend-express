import { Router, Request, Response } from "express";
import { Note } from "../../models/note";
import { authenticateUser } from "../../middlewares/auth";

const router = Router();

router.get(
  "/details",
  authenticateUser,
  async (req: Request, res: Response) => {
    const { userRecord } = req;

    if (!userRecord) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { note_id } = req.query;

    if (!note_id) {
      return res.status(400).json({ error: "Missing note_id" });
    }

    const note = await Note.findByPk(String(note_id));

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    if (note.user_id !== userRecord.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    return res.status(200).json({ note });
  }
);

export default router;
