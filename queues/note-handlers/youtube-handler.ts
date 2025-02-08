import axios from "axios";
import { Note } from "../../models/note";
import { downloadAudio } from "../../utils/downloadFile";
import {
  extractTimestamps,
  transcribeWithFirework,
} from "../../utils/transcription";
import { generateNoteSummary } from "../../utils/note/note-processing";

export async function preprocessYoutubeNote(note: Note, youtubeUrl: string) {
  console.time("getYoutubeAudioLink");
  const audioLink = await downloadYoutubeWithTimeout(youtubeUrl);
  console.timeEnd("getYoutubeAudioLink");
  console.log("audioLink", audioLink);

  console.time("downloadAudio");
  const audioPath = await downloadAudio(audioLink);
  console.timeEnd("downloadAudio");

  const transcript = await transcribeWithFirework({
    file: audioPath,
  });

  const { text, language } = transcript;

  note.source_language = language;
  note.timestamps = extractTimestamps(transcript.segments);

  const summary = await generateNoteSummary(text);

  note.content = text || "";
  note.summary = summary || "";
  note.resource_urls = [youtubeUrl];

  await note.save();
}

async function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadYoutubeWithTimeout(url: string) {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await downloadYoutubeAudio(url);
      if (res.status === "processing") {
        await timeout(1000);
        continue;
      } else if (res.status === "ok") {
        return res.link;
      } else {
        throw new Error("Failed to download youtube audio");
      }
    } catch (error) {
      console.log("Error downloading youtube audio", error);
      await timeout(1000);
    }
  }
}

async function downloadYoutubeAudio(url: string) {
  const id = extractYoutubeId(url);
  const response = await axios.get(
    `https://youtube-mp36.p.rapidapi.com/dl?id=${id}`,
    {
      headers: {
        "x-rapidapi-ua": "RapidAPI-Playground",
        "x-rapidapi-key": "TayDHG2cqImsh7C3L5CYLVut5ZbOp1lOCHfjsnNtUgZtqRIQ9v",
        "x-rapidapi-host": "youtube-mp36.p.rapidapi.com",
      },
    }
  );

  return response.data;
}

function extractYoutubeId(url: string) {
  const urlObj = new URL(url);
  const id = urlObj.searchParams.get("v");
  return id;
}
