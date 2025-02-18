import { trimStart } from "lodash";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import fireworks, { FireworksModels } from "../../config/fireworks";
import openai from "../../config/openai";
import { chunk } from "llm-chunk";
import {
  cleanAndParseGeminiResponse,
  gemini15Flash,
  gemini20Flash,
} from "../../config/gemini";
import { Note } from "../../models/note";
import { SchemaType } from "@google/generative-ai";
import { getLanguageName } from "../transcription";

export async function generateNoteSummary(content: string) {
  console.time("generateNoteSummary");
  const summary = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Without explanation, summarize the content of the note in a study-note style using Markdown. Your response must include title (should not says it is a summary), heading, bullets, tables (if applicable), and concise sections.",
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

export async function generateNoteSummaryWithGemini(content: string) {
  const summary = await gemini20Flash.generateContent([
    `Without explanation, summarize the content of the provided text as a beautiful markdown study-note. Your response must include title (should not says it is a summary), heading, bullets, tables (if applicable), and concise sections. Output content must be in same language as input text.
Text: ${content}`,
  ]);
  return summary.response.text();
}

export async function generateBookSummary(content: string) {
  console.time("generateBookSummary");
  const summary = await gemini20Flash.generateContent([
    `Without explanation, summarize the content of the provided PDF content as a beautiful markdown study-note. Your summary should be detailed and comprehensive for every chapter of the book, and must include heading, bullets, tables (if applicable), and concise sections. Output content must be in same language as input text.
PDF content: ${content}`,
  ]);
  return summary.response.text().trim();
}

export function extractNoteTitle(content: string) {
  const contentArray = content.split("\n");
  if (!contentArray.length) {
    return "Invalid text";
  }
  const title = contentArray.find((line) => line.startsWith("# "));
  if (!title) {
    return contentArray[0].trim();
  }
  return title.replace("# ", "").trim();
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
    maxLength: 2000,
    splitter: "sentence",
    overlap: 200,
  });

  return chunks;
}

export async function generateNoteChunks(content: string) {
  const chunks = await chunkWithLangChain(content, 300, 50);
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
    category: string;
  }[]
> {
  const questionCount = await estimateQuestionCount(note.content);
  const prompt = `Without explanation, extract at least ${5} or more key questions and answers for each question from this note:
  
Note content: ${note.content}
  
----
Your response is a JSON array, use this format:
[{    
  "question": string - must be descriptive - avoid yes/no question,    
  "best_answer": best answer for the question  
}]

Question and answer must be in ${getLanguageName(note.source_language)}
`;
  console.log(prompt);
  console.time("extractNoteKeyQuestions");
  const result = await gemini20Flash.generateContent({
    contents: [
      {
        parts: [{ text: prompt }],
        role: "user",
      },
    ],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
      responseSchema: {
        description: "Array of question and answer",
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            question: {
              type: SchemaType.STRING,
              description: "Question",
              nullable: false,
            },
            best_answer: {
              type: SchemaType.STRING,
              description: "Best answer for the question",
              nullable: false,
            },
          },
          required: ["question", "best_answer"],
        },
      },
    },
  });
  const response = result.response.text();
  console.log(response);
  const json = cleanAndParseGeminiResponse(response);
  console.log(json);
  console.timeEnd("extractNoteKeyQuestions");
  return json;
}

export async function chunkWithLangChain(
  text: string,
  chunkSize = 256,
  chunkOverlap = 50
) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ["\n\n", "\n", " "], // Prioritizing paragraph, then line, then space
  });

  return await splitter.splitText(text);
}
