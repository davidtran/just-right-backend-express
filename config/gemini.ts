import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

const gemini15Flash = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-001",
});

const gemini20Flash = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-001",
});

export { gemini15Flash, gemini20Flash };

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
