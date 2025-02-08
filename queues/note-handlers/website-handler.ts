import axios from "axios";
import { Note } from "../../models/note";
import { parse } from "node-html-parser";
import { detectLanguage } from "../../utils/document-processor";

export async function preprocessWebsiteNote(note: Note, websiteUrl: string) {
  console.log("preprocessWebsiteNote", websiteUrl);
  const text = await fetchWebsiteContent(websiteUrl);
  const language = await detectLanguage(text);
  console.log(language);
  note.source_language = language.lang;
  note.content = text;
  await note.save();
}

async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ProfessorAI/1.0; +http://yourwebsite.com)",
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
