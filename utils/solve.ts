import openai from "../config/openai";
import { Question } from "../models/question";
import { cleanAndParseGeminiResponse, gemini15Flash } from "../config/gemini";
import groq, { GROQ_MODEL } from "../config/groq";
import Groq from "groq-sdk";
import { SchemaType } from "@google/generative-ai";

export async function convertImageToText(
  base64Image: string
): Promise<{ content: string; is_math_exercise: boolean }> {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Convert the provided image into text. Your response is a JSON object with 2 fields: content and is_math_exercise. Content is empty if there is no text quesion in the image.`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = res.choices[0].message.content;
  console.log(content);
  if (!content) {
    throw new Error("No content in the response");
  }
  const json = JSON.parse(content);
  return json;
}

export async function convertImageToTextWithGemini(
  base64Image: string
): Promise<{ content: string; is_math_exercise: boolean }> {
  const res = await gemini15Flash.generateContent({
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: "image/jpeg",
            },
          },
        ],
        role: "user",
      },
      {
        parts: [
          {
            text: "Extract the text from the image. Your response is a JSON of 2 fields: content, is_math_exercise, is_empty. Format all mathematical expressions in the text using LaTeX/MathJax syntax. Use $...$ for inline math and $$...$$for display math.",
          },
        ],
        role: "user",
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        description: "Chat response",
        type: SchemaType.OBJECT,
        properties: {
          content: {
            type: SchemaType.STRING,
            description: "Image content",
            nullable: false,
          },
          is_math_exercise: {
            type: SchemaType.BOOLEAN,
            description: "is this a math exercise?",
            nullable: false,
          },
          is_empty: {
            type: SchemaType.BOOLEAN,
            description: "no exercise found?",
            nullable: false,
          },
        },
        required: ["content", "is_math_exercise", "is_empty"],
      },
    },
  });

  const text = res.response.text();

  const json = cleanAndParseGeminiResponse(text);

  return json;
}

const MATH_PROMPT = `Format all mathematical expressions in my text using Katex syntax. Use $...$ for inline math and $$...$$ for display math.`;

function getQuickSolveMessages(question: Question) {
  const messages = [
    {
      role: "system",
      content: "You are TutorAI",
    },
    {
      role: "user",
      content: `Do not explain, just give me a very short result for question(s): ${JSON.stringify(
        question.question
      )}.`,
    },
  ] as Groq.Chat.ChatCompletionMessageParam[];

  return messages;
}

export async function quickSolve(question: Question): Promise<string> {
  const messages = getQuickSolveMessages(question);
  const response = await groq.chat.completions.create({
    model: GROQ_MODEL.DEEPSEEK_R1,
    messages,
    reasoning_format: "hidden",
  });

  const content = response.choices[0].message.content || "";
  const translatedContent = await ensureTranslation(question, content);
  return translatedContent;
}

export async function explain(question: Question): Promise<string> {
  const messages = getQuickSolveMessages(question);
  messages.push({
    role: "assistant",
    content: question.short_answer,
  });
  messages.push({
    role: "user",
    content: `Explain your previous answer(s) step by step.`,
  });
  console.log(JSON.stringify(messages));
  console.time("explainAnswer");
  const response = await groq.chat.completions.create({
    model: GROQ_MODEL.DEEPSEEK_R1,
    messages,
    reasoning_format: "hidden",
  });
  console.timeEnd("explainAnswer");

  const content = response.choices[0].message.content || "";
  const translatedContent = await ensureTranslation(question, content);
  return translatedContent;
}

async function convertToLatex(content: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Format all mathematical expressions in my text using Katex syntax. Use $...$ for inline math and $$...$$ for display math.",
      },
      { role: "user", content: content },
    ],
  });

  return response.choices[0].message.content || "";
}

async function ensureTranslation(question: Question, answer: string) {
  let prompt = `Here is my question: ${JSON.stringify(
    question.question
  )}. My answer: ${answer}. Without explanation, rewrite my answer to the same language as the question.`;

  if (question.math) {
    prompt += `\n${MATH_PROMPT}`;
  }

  const response = await gemini15Flash.generateContent([{ text: prompt }]);
  return response.response.text();
}
