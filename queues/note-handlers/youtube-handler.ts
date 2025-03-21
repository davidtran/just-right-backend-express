import { Note } from "../../models/note";
import { transcribeYoutube } from "../../utils/youtube/youtube-transcriptor";
import { detectLanguage } from "../../utils/document-processor";
import {
  cleanAndParseGeminiResponse,
  gemini20Flash,
} from "../../config/gemini";
import { SchemaType } from "@google/generative-ai";

export async function preprocessYoutubeNote(note: Note, youtubeUrl: string) {
  const { title, text, segments } = await transcribeYoutube(youtubeUrl);
  // console.time("getYoutubeTranscriptWithGemini");
  // await getYoutubeTranscriptWithGemini(youtubeUrl);
  // console.timeEnd("getYoutubeTranscriptWithGemini");
  if (!text || text.length < 200) {
    throw new Error("No text found");
  }
  const language = await detectLanguage(text);

  note.source_language = language;
  note.timestamps = segments;
  note.title = title;
  note.content = text || "";
  note.resource_urls = [youtubeUrl];

  await note.save();
}

// TODO: we will revise it later, currently it's too slow
async function getYoutubeTranscriptWithGemini(youtubeUrl: string) {
  const result = await gemini20Flash.generateContent([
    `Can you give me the title and transcription of the video in this format: 
Title: (title)
Transcription:
[00:00:02] (text)
[00:00:05] (text)
[00:00:10] (text)
`,
    {
      fileData: {
        fileUri: youtubeUrl,
        mimeType: "video/mp4",
      },
    },
  ]);

  const videoContent = result.response.text();

  console.log(videoContent);
  const parsed = parseTranscription(videoContent);
  console.log(parsed);
  return parsed;
}

interface ISegment {
  start: number;
  end: number;
  text: string;
}

function parseTranscription(input: string): {
  title: string;
  text: string;
  segments: ISegment[];
} {
  const lines = input.split("\n").filter((line) => line.trim() !== "");

  // Extract title
  const titleIndex = lines.findIndex((line) => line.startsWith("Title:"));
  const title = lines[titleIndex].replace("Title:", "").trim();

  // Get full text
  const transcriptionIndex = lines.findIndex((line) =>
    line.startsWith("Transcription:")
  );
  const textLines = lines.slice(transcriptionIndex + 1);
  const fullText = textLines
    .map((line) => line.replace(/^\[\d+:\d+:\d+\]\s*/, ""))
    .join(" ")
    .trim();

  // Function to convert timestamp to seconds
  const timestampToSeconds = (timestamp: string): number => {
    const parts = timestamp.split(":").map(Number);
    if (parts.length === 2) {
      // [MM:SS] format
      const [minutes, seconds] = parts;
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      // [HH:MM:SS] format
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0; // Default case
  };

  // Parse segments
  const segments: ISegment[] = [];
  let currentEnd = 0;

  textLines.forEach((line, index) => {
    const timestampMatch = line.match(/^\[(\d+:\d+:\d+)\]/);
    if (timestampMatch) {
      const startTime = timestampMatch[1];
      const startSeconds = timestampToSeconds(startTime);
      const text = line.replace(timestampMatch[0], "").trim();

      if (index > 0) {
        // Update previous segment's end time
        segments[segments.length - 1].end = startSeconds;
      }

      segments.push({
        start: startSeconds,
        end: 0, // Will be filled by next segment or calculated
        text,
      });

      currentEnd = startSeconds;
    } else if (segments.length > 0) {
      // Append text to previous segment if no timestamp
      segments[segments.length - 1].text += " " + line.trim();
    }
  });

  // Set end time for last segment (adding 1 second)
  if (segments.length > 0) {
    segments[segments.length - 1].end = segments[segments.length - 1].start + 1;
  }

  return {
    title,
    text: fullText,
    segments,
  };
}
