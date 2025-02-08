import { Router } from "express";

import list from "./list";
import status from "./status";
import details from "./details";
import quiz from "./quiz";
import flashcard from "./flashcard";
import chat from "./chat";
import mindmap from "./mindmap";
import deleteNote from "./delete-note";
import feynman from "./feynman";
const router = Router();

router.use(list);
router.use(status);
router.use(details);
router.use(quiz);
router.use(flashcard);
router.use(chat);
router.use(mindmap);
router.use(deleteNote);
router.use(feynman);

export default router;
