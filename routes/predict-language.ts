import { Router } from "express";
import { detectLanguage } from "../utils/document-processor";

const router = Router();

router.get("/predict-language", async (req, res) => {
  const { text } = req.query;
  const language = await detectLanguage(String(text));
  res.json({ language });
});

export default router;
