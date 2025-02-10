import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";
import { logError } from "../../config/firebaseAdmin";
import openai from "../../config/openai";
import FeynmanUsage from "../../models/feynman-usage";
import { detectLanguage } from "../../utils/document-processor";
import { languages } from "../../constants/languages";
import { trimQuotes } from "../../utils/general";
import { gemini20Flash } from "../../config/gemini";

const router = Router();

router.post("/init", authenticateUser, async (req: Request, res: Response) => {
  const { userRecord } = req;
  if (!userRecord) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }

  try {
    const { topic } = req.body;

    let feynmanUsage = await FeynmanUsage.findOne({
      where: { user_id: userRecord.id },
    });

    if (!feynmanUsage) {
      feynmanUsage = await FeynmanUsage.create({
        user_id: userRecord.id,
        usage_count: 0,
      });
    }

    if (!userRecord.is_pro && feynmanUsage?.usage_count > 5) {
      return res.status(200).json({
        message: "Unauthorized: User has already used Feynman chat",
        usage_limit_reached: true,
      });
    }

    const detectedLanguage = await detectLanguage(topic);
    let language = "en";
    if (detectedLanguage) {
      language = detectedLanguage.lang;
    }
    const languageName = languages[language]
      ? languages[language].name
      : "English";

    if (languageName === "English") {
      return res.status(200).json({
        message: `Hey, please explain ${topic} to me like I'm a 5 years old!`,
      });
    }

    const response = await gemini20Flash.generateContent({
      contents: [
        {
          parts: [
            {
              text: `Without explanation, friendly rewrite "Hey, please explain ${topic} to me" to ${languageName}.`,
            },
          ],
          role: "user",
        },
      ],
    });

    const result = response.response.text();
    res
      .status(200)
      .json({ message: trimQuotes(result || ""), language: languageName });
  } catch (error) {
    await logError(error as Error, {
      route: "/feynman/init",
      userId: req.user?.uid,
      requestBody: req.body,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
