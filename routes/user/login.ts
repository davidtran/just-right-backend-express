import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";
import { User } from "../../models/user";
import { generateRandomName } from "../../utils/nameGenerator";
import { Note } from "../../models/note";
import sampleData from "../../scripts/sample.json";
const router = Router();
import { identity, pickBy } from "lodash";
import NoteChunk from "../../models/note-chunk";
import { Quiz } from "../../models/quiz";
import { Flashcard } from "../../models/flashcard";
import NoteQuestion from "../../models/note-question";

router.post(
  "/users/login",
  authenticateUser,
  async (req: Request, res: Response) => {
    console.log("login");
    const { user, userRecord } = req;
    const { locale } = req.body;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
    try {
      if (!userRecord) {
        const newUser = await User.create({
          uid: user.uid,
          email: user.email,
          name: user.name || generateRandomName(),
          locale: locale || "en",
        });
        await copySampleData(newUser);
      }

      return res.status(200).send({
        success: true,
      });
    } catch (e) {
      console.log(e);
      return res.status(500).send({});
    }
  }
);

async function copySampleData(userRecord: User) {
  const notes = await Note.findAll({ where: { user_id: userRecord.id } });
  if (notes.length) {
    return;
  }

  let sampleNote = {
    ...sampleData.note,
    id: undefined,
    user_id: userRecord.id,
    created_at: new Date(),
    updated_at: new Date(),
    is_sample: true,
  };

  const note = new Note({
    ...pickBy(sampleNote, identity),
  });

  await note.save();

  await Promise.all(
    sampleData.chunks.map((chunk) => {
      return new NoteChunk({
        ...pickBy(
          {
            ...chunk,
            id: undefined,
            note_id: note.id,
          },
          identity
        ),
        user_id: userRecord.id,
      }).save();
    })
  );

  await Promise.all(
    sampleData.quizzes.map((quiz) => {
      return new Quiz({
        ...pickBy(
          {
            ...quiz,
            id: undefined,
            note_id: note.id,
          },
          identity
        ),
        user_id: userRecord.id,
      }).save();
    })
  );

  await Promise.all(
    sampleData.flashcards.map((flashcard) => {
      return new Flashcard({
        ...pickBy(
          {
            ...flashcard,
            id: undefined,
            note_id: note.id,
          },
          identity
        ),
        user_id: userRecord.id,
      }).save();
    })
  );

  await Promise.all(
    sampleData.questions.map((question) => {
      return new NoteQuestion({
        ...pickBy(
          {
            // @ts-ignore
            ...question,
            id: undefined,
            note_id: note.id,
          },
          identity
        ),
        user_id: userRecord.id,
      }).save();
    })
  );
}

export default router;
