import { Note } from "../../models/note";
import { uploadObject } from "../../utils/cdn";
import {
  fixTranscription,
  generateNoteSummary,
} from "../../utils/note/note-processing";
import { generateNoteEmbedding } from "../../utils/note/note-processing";
import {
  extractTimestamps,
  transcribeWithFirework,
} from "../../utils/transcription";

export const preprocessAudioNote = async (note: Note, audioPath: string) => {
  const transcript = await transcribeWithFirework({
    file: audioPath,
  });

  if (!transcript) {
    throw new Error("Failed to transcribe audio");
  }

  const { text, language } = transcript;

  if (!text || text.length < 200) {
    throw new Error("No text found");
  }

  note.source_language = language;
  note.timestamps = extractTimestamps(transcript.segments);
  note.content = text || "";

  const url = await uploadObject(audioPath);
  if (url) {
    note.resource_urls = [url];
  }

  await note.save();
  return note;
};
