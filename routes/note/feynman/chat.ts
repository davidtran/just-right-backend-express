import { Router, Request, Response } from "express";
import { authenticateUser } from "../../../middlewares/auth";
import { Note } from "../../../models/note";
import { logError } from "../../../config/firebaseAdmin";
import { IChatMessage, INoteQuestion } from "../../../constants/interfaces";
import { getLanguageName } from "../../../utils/transcription";
import { redisClient } from "../../../config/redis";
import { NOTE_SESSION_KEY_PREFIX } from "../../../constants/constants";
import { translateWithGemini } from "../../../utils/note/note-processing";
import { uniqBy } from "lodash";

const router = Router();

router.post("/chat", authenticateUser, async (req: Request, res: Response) => {
  try {
    const { userRecord } = req;

    if (!userRecord) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { note_id, messages } = req.body;

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

    const chatMessages = messages as IChatMessage[];

    if (!redisClient) {
      return res.status(500).json({ error: "Redis client not initialized" });
    }

    const sessionData = await redisClient.get(
      `${NOTE_SESSION_KEY_PREFIX}${note.id}`
    );

    if (!sessionData) {
      return res.status(404).json({ error: "Session data not found" });
    }

    const noteSessionData = JSON.parse(sessionData) as INoteQuestion[];

    console.log(noteSessionData);

    const questionCount = uniqBy(
      chatMessages.filter((item) => item.role === "assistant"),
      "content"
    ).length;

    console.log(questionCount);

    if (questionCount >= noteSessionData.length) {
      return res.status(200).json({
        message: "",
        is_done: true,
      });
    }

    let nextQuestion = noteSessionData[questionCount].question;

    if (note.target_language && note.source_language !== note.target_language) {
      nextQuestion = await translateWithGemini(
        nextQuestion,
        getLanguageName(note.target_language)
      );
    }

    return res.status(200).json({
      message: nextQuestion,
      is_done: questionCount === noteSessionData.length,
    });
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    await logError(error as Error, {
      context: "/note/feynman/init",
      note_id: req.body.note_id,
    });
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
