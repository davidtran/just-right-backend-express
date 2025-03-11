import { gemini20Flash } from "../config/gemini";

// Convert markdown to plain text suitable for TTS
export const convertMarkdownToSpeechText = async (
  markdown: string,
  originalContent: string,
  language: string
): Promise<string> => {
  try {
    const prompt = `Without explanation, rewrite the following markdown to podcast content, you can refer to the original content for additional context, remove code block, table, elements, symbols, and other non-speech elements that are not suitable for text to speech:
${markdown}

Original content:
${originalContent}

Your output language must be in ${language}`;

    const result = await gemini20Flash.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text.trim();
  } catch (error) {
    console.error("Error converting markdown to speech text:", error);
    // Fallback to a simple markdown cleanup if Gemini fails
    return markdown
      .replace(/```[^`]*```/g, "") // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Replace links with just the text
      .replace(/[*_~`#]/g, "") // Remove formatting characters
      .replace(/\n\n+/g, "\n\n") // Normalize line breaks
      .trim();
  }
};
