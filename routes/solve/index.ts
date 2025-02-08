import { Router } from "express";

import quickSolve from "./quick";
import upload from "./upload";
import explain from "./explain";
import deleteQuestion from "./delete-question";
const router = Router();

router.use(quickSolve);
router.use(upload);
router.use(explain);
router.use(deleteQuestion);
export default router;
