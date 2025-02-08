import { Note } from "../../models/note";
import { detectLanguage } from "../../utils/document-processor";
import { generateNoteSummary } from "../../utils/note/note-processing";
import { generateNoteEmbedding } from "../../utils/note/note-processing";

export async function preprocessTextNote(note: Note, text: string) {
  note.content = text;
  note.source_language = await detectLanguage(text);

  const summary = await generateNoteSummary(text);

  note.title = summary || "";
  note.content = text || "";

  await note.save();
}
