import { Note } from "../../models/note";
import { transcribeYoutube } from "../../utils/youtube/youtube-transcriptor";
import { detectLanguage } from "../../utils/document-processor";

export async function preprocessYoutubeNote(note: Note, youtubeUrl: string) {
  const { title, text, segments } = await transcribeYoutube(youtubeUrl);
  const language = await detectLanguage(text);

  note.source_language = language.lang;
  note.timestamps = segments;
  note.title = title;
  note.content = text || "";
  note.resource_urls = [youtubeUrl];

  await note.save();
}
