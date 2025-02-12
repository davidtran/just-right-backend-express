import { gemini15Flash } from "../config/gemini";
import openai from "../config/openai";
import { readFile } from "fs/promises";
import { resizeAndConvertImageToBase64 } from "./image";

const LanguageDetection = require("@smodin/fast-text-language-detection");

export async function detectLanguage(text: string): Promise<string> {
  const detector = new LanguageDetection();
  const result = await detector.predict(text);
  if (
    result.length > 0 &&
    result[0].prob >= 0.5 &&
    result[0].isReliableLanguage
  ) {
    return result[0].lang;
  }
  return "en";
}

export async function extractTextFromImage(imagePath: string) {
  const base64Image = await resizeAndConvertImageToBase64(imagePath);
  const text = await gemini15Flash.generateContent({
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: "image/jpeg",
            },
          },
        ],
        role: "user",
      },
      {
        parts: [
          {
            text: "Extract text from the image.",
          },
        ],
        role: "user",
      },
    ],
  });

  return text.response.text() || "";
}

async function fileToBase64(filepath: string): Promise<string> {
  const buffer = await readFile(filepath);
  return buffer.toString("base64");
}
