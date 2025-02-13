import openai from "../config/openai";
import { Question } from "../models/question";
import {
  cleanAndParseGeminiResponse,
  gemini15Flash,
  gemini20Flash,
} from "../config/gemini";
import groq, { GROQ_MODEL } from "../config/groq";
import Groq from "groq-sdk";
import { SchemaType } from "@google/generative-ai";

export async function convertImageToTextWithGemini(base64Image: string) {
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
            text: "Extract the text from the image.",
          },
        ],
        role: "user",
      },
    ],
  });

  const text = res.response.text();
  return text;
}

export async function parseExerciseContent(content: string): Promise<{
  content: string;
  direct_answer: boolean;
  is_math_exercise: boolean;
}> {
  const res = await gemini20Flash.generateContent({
    contents: [
      {
        parts: [
          {
            text: `Analyze the text content below:
${content}. 

Your response is a JSON of 3 fields: 
- content (Format all mathematical expressions in the text using LaTeX/MathJax syntax. Use $...$ for inline math and $$...$$for display math.)
- is_math_exercise (boolean)
- objective_question (is this a objective question?)`,
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
          objective_question: {
            type: SchemaType.BOOLEAN,
            description: "is this a objective question?",
            nullable: false,
          },
        },
        required: ["content", "is_math_exercise", "objective_question"],
      },
    },
  });

  const text = res.response.text();
  console.log(text);
  const json = cleanAndParseGeminiResponse(text);
  json.direct_answer = json.objective_question;

  return json;
}

const MATH_PROMPT = `Format all mathematical expressions in my text using Katex syntax.`;

function getQuickSolveMessages(question: Question) {
  const messages = [
    {
      role: "user",
      content: `Answer this question, step by step: ${JSON.stringify(
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
    reasoning_format: "parsed",
  });

  console.log(response.choices[0].message.reasoning);

  const content = response.choices[0].message.content || "";
  const translatedContent = await ensureQuickSolveTranslation(
    question,
    content
  );
  question.short_answer = translatedContent;
  question.detail_answer = content;
  return translatedContent;
}

export async function explain(question: Question): Promise<string> {
  const translatedContent = await ensureTranslation(
    question,
    question.detail_answer
  );
  return translatedContent;
}

async function ensureTranslation(question: Question, answer: string) {
  let prompt = `Question: ${JSON.stringify(
    question.question
  )}. Answer: ${answer}. 
  
  Your task: Do not explain, rewrite the answer in same language as question`;

  if (question.math) {
    prompt += `\n${MATH_PROMPT}`;
  }

  const response = await gemini20Flash.generateContent([{ text: prompt }]);
  return response.response.text();
}

async function ensureQuickSolveTranslation(question: Question, answer: string) {
  let prompt = `Question: ${JSON.stringify(question.question)}.

Answer: ${answer}.`;

  if (question.direct_answer || question.math) {
    prompt += `Remove any unnecessary explanation, just give me the result.`;
  }

  prompt += `\nEnsure the answer is in the same language as the question.`;

  if (question.math) {
    prompt += `\n${MATH_PROMPT}`;
  }

  const response = await gemini20Flash.generateContent([{ text: prompt }]);
  return response.response.text();
}
