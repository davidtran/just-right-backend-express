import { Router } from "express";
import audio from "./audio";
import youtube from "./youtube";
import website from "./website";
import images from "./images";
import pdf from "./pdf";
import text from "./text";

const router = Router();

router.use(audio);
router.use(youtube);
router.use(website);
router.use(images);
router.use(pdf);
router.use(text);

export default router;
