import { Router, Request, Response } from "express";
import { authenticateUser } from "../../../middlewares/auth";
import { Note } from "../../../models/note";
import { NoteMessage } from "../../../models/note-message";
import { logError } from "../../../config/firebaseAdmin";

const router = Router();

router.get(
  "/messages",
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

    try {
      const note = await Note.findByPk(String(note_id));

      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }

      let messages = await NoteMessage.findAll({
        where: {
          note_id: note.id,
        },
        order: [["created_at", "ASC"]],
      });

      if (messages.length === 0) {
        const defaultMessage = await NoteMessage.create({
          note_id: note.id,
          role: "assistant",
          content: `Hi! I'm your AI assistant. I can help you analyze and understand this note about "${note.title}". What would you like to know?`,
        });
        messages = [defaultMessage];
      }

      return res.json({ messages: messages.map((m) => m.toJSON()) });
    } catch (error) {
      console.error(error);
      logError(error as Error, {
        route: "/note/chat/messages",
        note_id: note_id,
      });
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
