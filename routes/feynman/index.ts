import { Router } from "express";
import init from "./init";
import result from "./result";
import chat from "./chat";

const router = Router();

router.use(init);
router.use(chat);
router.use(result);

export default router;
