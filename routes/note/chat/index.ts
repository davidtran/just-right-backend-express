import { Router } from "express";
import messages from "./messages";
import send from "./send";
import clear from "./clear";
const router = Router();

router.use("/chat", messages);
router.use("/chat", send);
router.use("/chat", clear);

export default router;
