import { Router } from "express";
import { authenticateUser } from "../../../middlewares/auth";
import { Note } from "../../../models/note";

const router = Router();

router.post("/suggestions", authenticateUser, async (req, res) => {
  const { note_id, question } = req.body;
  const { userRecord } = req;

  if (!note_id || !question || !userRecord) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const note = await Note.findByPk(note_id);

  if (!note) {
    return res.status(404).json({ error: "Note not found" });
  }
});

export default router;
