import express from "express";
import { getAudio } from "./get-audio";

const router = express.Router();

router.get("/audio/:noteId", getAudio);

export default router;
