import { Router } from "express";
import audio from "./audio";
import youtube from "./youtube";
import website from "./website";
import images from "./images";
import pdf from "./pdf";

const router = Router();

router.use(audio);
router.use(youtube);
router.use(website);
router.use(images);
router.use(pdf);

export default router;
