import { Router } from "express";
import { authenticateUser } from "../../../middlewares/auth";
import { Note } from "../../../models/note";
import { NoteMessage } from "../../../models/note-message";
import { logError } from "../../../config/firebaseAdmin";

const router = Router();

router.delete("/clear", authenticateUser, async (req, res) => {
  const { userRecord } = req;
  const { note_id } = req.body;

  if (!userRecord) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const note = await Note.findByPk(note_id);
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (note.user_id !== userRecord.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await NoteMessage.destroy({
      where: {
        note_id,
      },
    });

    return res.status(200).json({ message: "Note messages cleared" });
  } catch (error) {
    logError(error as Error, {
      route: "/note/chat/clear",
      user_id: userRecord.id,
    });
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
