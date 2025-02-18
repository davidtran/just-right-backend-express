import { Note } from "../../models/note";
import { detectLanguage } from "../../utils/document-processor";
import { generateNoteSummary } from "../../utils/note/note-processing";
import { generateNoteEmbedding } from "../../utils/note/note-processing";

export async function preprocessTextNote(note: Note, text: string) {
  if (!text || text.length < 200) {
    throw new Error("No text found");
  }

  note.content = text;
  note.source_language = await detectLanguage(text);
  note.content = text || "";

  await note.save();
}
