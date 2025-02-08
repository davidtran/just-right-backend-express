import { Router } from "express";
import transcribe from "./transcribe";

const router = Router();

router.use(transcribe);

export default router;
