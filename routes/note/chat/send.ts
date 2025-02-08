import { Router, Request, Response } from "express";
import { authenticateUser } from "../../../middlewares/auth";
import { Note } from "../../../models/note";
import { findContext } from "../../../utils/note/embedding";
import { logError } from "../../../config/firebaseAdmin";
import openai from "../../../config/openai";
import { IChatMessage } from "../../../constants/interfaces";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { NoteMessage } from "../../../models/note-message";

const router = Router();

router.post("/send", authenticateUser, async (req: Request, res: Response) => {
  try {
    const { userRecord } = req;

    if (!userRecord) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { note_id, new_message } = req.body;

    console.log("new_message", new_message);

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

    const chatMessages = await NoteMessage.findAll({
      where: {
        note_id: note.id,
      },
      order: [["created_at", "ASC"]],
    });

    // Find relevant context from vector database
    const context = await findContext(new_message, note.id, 3);

    console.log(context);

    await NoteMessage.create({
      note_id: note.id,
      role: "user",
      content: new_message,
    });

    // Prepare messages for OpenAI with context
    const messagesWithContext = [
      {
        role: "system",
        content: `You are a Feynmind app. You are chating with user about the note: ${
          note.title
        }. ${
          context.length > 0
            ? `Use the following information to answer the user's question: ${context}`
            : ""
        }. \n\nKeep your response concise and to the point.`,
      },
      {
        role: "user",
        content: new_message,
      },
    ] as ChatCompletionMessageParam[];

    console.log(messagesWithContext);

    // Get response from OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messagesWithContext,
      temperature: 0.7,
      max_tokens: 700,
    });

    const assistantResponse = completion.choices[0].message.content;

    await NoteMessage.create({
      note_id: note.id,
      role: "assistant",
      content: assistantResponse,
    });

    return res.json({
      message: assistantResponse,
    });
  } catch (error) {
    await logError(error as Error, {
      route: "/note/chat",
      note_id: req.body.note_id,
    });
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
