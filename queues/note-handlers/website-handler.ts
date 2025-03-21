import axios from "axios";
import { Note } from "../../models/note";
import { parse } from "node-html-parser";
import { detectLanguage } from "../../utils/document-processor";

export async function preprocessWebsiteNote(note: Note, websiteUrl: string) {
  const text = await fetchWebsiteContent(websiteUrl);

  if (!text || text.length < 200) {
    throw new Error("No text found");
  }

  const language = await detectLanguage(text);
  note.source_language = language;
  note.content = text;
  await note.save();
}

async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TutorAI/1.0; +https://tutoraistudy.com)",
      },
    });

    const root = parse(response.data);

    // Remove script tags, style tags, and other unnecessary elements
    root
      .querySelectorAll("script, style, nav, footer, header, iframe")
      .forEach((element) => element.remove());

    // Extract text from main content areas
    const mainSelectors = ["main", "article", ".content", "#content", ".main"];
    let mainContent = "";

    for (const selector of mainSelectors) {
      const element = root.querySelector(selector);
      if (element) {
        mainContent = element.textContent.trim();
        if (mainContent) break;
      }
    }

    // Fallback: get text from body if no main content found
    if (!mainContent) {
      mainContent =
        root.querySelector("body")?.textContent.replace(/\s+/g, " ").trim() ||
        "";
    }

    return mainContent;
  } catch (error) {
    throw new Error(
      `Failed to fetch website: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
