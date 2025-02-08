import { Router } from "express";
import init from "./init";
import chat from "./chat";
import result from "./result";

const router = Router();

router.use("/feynman", init);
router.use("/feynman", chat);
router.use("/feynman", result);

export default router;
