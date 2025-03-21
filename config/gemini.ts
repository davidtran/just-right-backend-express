import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

const gemini15Flash = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-001",
});

const gemini20Flash = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-001",
  systemInstruction:
    "You are TutorAI - developed by David Tran, a AI tutor that solves any problems. Never say you are Google Gemini.",
});

const gemini20FlashThinking = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-thinking-exp-01-21",
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    maxOutputTokens: 12000,
  },
  systemInstruction: "You are TutorAI, a AI tutor that solves any problems.",
});

export { gemini15Flash, gemini20Flash, gemini20FlashThinking };

export function cleanAndParseGeminiResponse(text: string): any {
  try {
    let cleanText = text.trim();
    if (cleanText.startsWith("```json") || cleanText.startsWith("```")) {
      const textArray = cleanText.split("\n");
      console.log("textArray", textArray);
      cleanText = textArray.slice(1, textArray.length - 1).join("\n");
    }
    cleanText = cleanText.trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Failed to parse Gemini response as JSON");
  }
}
