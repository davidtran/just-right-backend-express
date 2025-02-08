import { Note } from "../../models/note";
import {
  generateNoteEmbedding,
  generateNoteSummary,
} from "../../utils/note/note-processing";
import { uploadObject } from "../../utils/cdn";
import { detectLanguage } from "../../utils/document-processor";
import { extractTextFromImage } from "../../utils/document-processor";

export const preprocessImageNote = async (note: Note, resources: string[]) => {
  const textArray = await Promise.all(
    resources.map((resource) => extractTextFromImage(resource))
  );
  const text = textArray.join("\n");
  console.log(text);
  const language = await detectLanguage(text);
  console.log(language);
  note.source_language = language.lang;
  note.content = text;

  const urls = await Promise.all(
    resources.map((resource) => uploadObject(resource))
  );
  note.resource_urls = urls.filter((url): url is string => url !== null);

  await note.save();
};
