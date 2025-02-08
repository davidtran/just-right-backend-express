import axios from "axios";
import { createReadStream } from "fs";
import FormData from "form-data";
import { readFile } from "fs/promises";
import openai from "../config/openai";
import { languages } from "../constants/languages";

interface ITranscriptAudioProps {
  file: string;
  language?: string;
  format?: "text" | "json";
}

export const transcribeAudio = async ({
  file,
  format = "text",
}: ITranscriptAudioProps) => {
  const formData = new FormData();
  formData.append("file", createReadStream(file));
  formData.append("language", "vietnamese");
  if (format === "json") {
    formData.append("format", "json");
  }

  const response = await axios.post(
    "https://api.lemonfox.ai/v1/audio/transcriptions",
    formData,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer lW6VpH1ZuRnlPPCEKNVob9dJGhECoNnY`,
      },
    }
  );

  if (format === "text") {
    return response.data.text;
  } else {
    console.log(response.data);
    return response.data.verbose_json;
  }
};

export const translateText = async (text: string, language: string) => {
  const languageName = languages[language].nativeName;
  if (!languageName) {
    return text;
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Without explanation, translate provided text to ${languageName}`,
      },
      { role: "user", content: text },
    ],
  });

  return response.choices[0].message.content;
};

export const getLanguageName = (code: string) => {
  const languageName = languages[code].name;
  if (!languageName) {
    return code;
  }
  return languageName;
};

export async function transcribeAudioWithCloudflare({
  file,
  language = "vi",
}: ITranscriptAudioProps) {
  console.log(file);

  const blob = await readFile(file);
  const base64 = Buffer.from(blob).toString("base64");
  const url = `https://gateway.ai.cloudflare.com/v1/${process.env.CLOUDFLARE_ACCOUNT_ID}/gia-su-ai/workers-ai/@cf/openai/whisper-large-v3-turbo`;
  const input = {
    audio: base64,
  };
  const response = await axios.post(url, input, {
    headers: {
      Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  return response.data;
}

export async function transcribeWithFirework({ file }: ITranscriptAudioProps) {
  const formData = new FormData();
  formData.append("file", createReadStream(file));
  formData.append("vad_model", "silero");
  formData.append("alignment_model", "tdnn_ffn");
  formData.append("preprocessing", "none");
  formData.append("temperature", "0");
  formData.append("timestamp_granularities", "segment");
  formData.append("audio_window_seconds", "5");
  formData.append("speculation_window_words", "4");
  formData.append("response_format", "verbose_json");

  console.time("transcribeWithFirework");
  const response = await axios.post(
    "https://audio-prod.us-virginia-1.direct.fireworks.ai/v1/audio/transcriptions",
    formData,
    {
      headers: {
        Authorization: `Bearer d1v6H3GEf2BGLMwVk0zZ5Jxzb8kgAuYJPbDpBkMGlFbD8ZKB`,
        "Content-Type": "multipart/form-data",
      },
    }
  );

  console.timeEnd("transcribeWithFirework");

  return response.data;
}

export function extractTimestamps(segments: any) {
  return segments.map((segment: any) => {
    return {
      start: segment.start,
      end: segment.end,
      audio_start: segment.audio_start,
      audio_end: segment.audio_end,
      text: segment.text,
    };
  });
}
