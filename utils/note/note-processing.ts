import { trimStart } from "lodash";
import deepseek from "../../config/deepseek";
import fireworks, { FireworksModels } from "../../config/fireworks";
import openai from "../../config/openai";
import { chunk } from "llm-chunk";
import {
  cleanAndParseGeminiResponse,
  gemini15Flash,
  gemini20Flash,
} from "../../config/gemini";
import { Note } from "../../models/note";

export async function generateNoteSummary(content: string) {
  console.time("generateNoteSummary");
  const summary = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Without explanation, summarize the content of the note in a study-note style using Markdown. Your response must include bullets, tables (if applicable), and concise sections.",
      },
      {
        role: "user",
        content: content,
      },
    ],
  });

  const response = summary.choices[0].message.content;

  if (!response) {
    throw new Error("Failed to generate summary");
  }

  return response;
}

export async function generateBookSummary(content: string) {
  console.time("generateBookSummary");
  const summary = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Without explanation, summarize the content of the book in a study-note style using Markdown. Your summary should be detailed and comprehensive for every chapter of the book, and must include bullets, tables (if applicable), and concise sections.",
      },
      {
        role: "user",
        content: content,
      },
    ],
  });

  console.timeEnd("generateBookSummary");

  const response = summary.choices[0].message.content;

  if (!response) {
    throw new Error("Failed to generate summary");
  }

  return response;
}

export function extractNoteTitle(content: string) {
  const firstLine = content.split("\n")[0];
  const semicolonIndex = firstLine.indexOf(":");
  const slicePosition = semicolonIndex !== -1 ? semicolonIndex + 1 : 0;
  console.log(firstLine, semicolonIndex, slicePosition);
  const title = trimStart(firstLine.slice(slicePosition).trim(), "#").trim();
  return title;
}

export async function generateNoteTitle(content: string) {
  console.time("generateNoteTitle");
  const firstLineIndex = content.indexOf("\n");
  const newContent = content.slice(firstLineIndex + 1).trim();
  const title = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Without explanation, generate a title for the note based on the content. The title should be concise and descriptive.",
      },
      { role: "user", content: newContent.slice(0, 500) },
    ],
  });

  console.timeEnd("generateNoteTitle");

  return title.choices[0].message.content;
}

export async function fixTranscription(content: string) {
  console.time("fixTranscription");
  const fixed = await fireworks.chat.completions.create({
    model: FireworksModels.LLAMA_V3P3_70B_INSTRUCT,
    messages: [
      {
        role: "system",
        content:
          "Without explanation, read the transcription, identify any grammar or spelling errors, and return the corrected transcription.",
      },
      { role: "user", content: content },
    ],
  });

  console.timeEnd("fixTranscription");

  return fixed.choices[0].message.content;
}

export async function generateNoteEmbedding(content: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: content,
  });

  const embedding = response.data[0].embedding;

  const result = `[${embedding.join(",")}]`;

  return result;
}

async function chunkText(content: string) {
  const chunks = chunk(content, {
    minLength: 500,
    maxLength: 5000,
    splitter: "sentence",
    overlap: 200,
  });

  return chunks;
}

export async function generateNoteChunks(content: string) {
  const chunks = await chunkText(content);
  const embeddings = await Promise.all(
    chunks.map((chunk) => generateNoteEmbedding(chunk))
  );

  return { chunks, embeddings };
}

export async function translateWithGemini(
  content: string,
  targetLanguage: string
) {
  const prompt = `Without explanation, translate the following text to ${targetLanguage}`;
  const result = await gemini15Flash.generateContent([prompt, content]);
  return result.response.text();
}

export async function estimateQuestionCount(content: string) {
  const wordCount = content.split(" ").length;
  return Math.ceil(wordCount / 10);
}

export async function extractNoteKeyQuestions(note: Note): Promise<
  {
    question: string;
    best_answer: string;
    explanation: string;
    importance: number;
  }[]
> {
  const questionCount = await estimateQuestionCount(note.content);
  const prompt = `Without explanation, extract all key questions to help the user understand the content: ${note.content}
  
----
Your response is a JSON object, use this format:
{
  "questions": [{    
    "question": string - must be descriptive - avoid yes/no question,    
    "best_answer": string - must be descriptive,    
  }]
}
`;
  console.time("extractNoteKeyQuestions");
  const result = await gemini20Flash.generateContent({
    contents: [
      {
        parts: [{ text: prompt }],
        role: "user",
      },
    ],
    generationConfig: {
      temperature: 0.1,
    },
  });
  const response = result.response.text();
  const json = cleanAndParseGeminiResponse(response);
  console.timeEnd("extractNoteKeyQuestions");
  return json.questions;
}
