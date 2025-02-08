import openai from "../config/openai";
import { readFile } from "fs/promises";

const LanguageDetection = require("@smodin/fast-text-language-detection");

export async function detectLanguage(text: string) {
  const detector = new LanguageDetection();
  const result = await detector.predict(text);
  if (result.length > 0) {
    return result[0];
  }
  return "en";
}

export async function extractTextFromImage(imagePath: string) {
  const base64Image = await fileToBase64(imagePath);
  const text = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Extract text from the image, convert math equation to mathjax format. Return empty string if there is no text in the image. ",
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
  });
  return text.choices[0]?.message?.content || "";
}

async function fileToBase64(filepath: string): Promise<string> {
  const buffer = await readFile(filepath);
  return buffer.toString("base64");
}
