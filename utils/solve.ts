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
import { detectLanguage } from "./document-processor";
import { getLanguageName } from "./transcription";

export async function convertImageToTextWithGemini(base64Image: string) {
  console.time("convertImageToTextWithGemini");
  const res = await gemini15Flash.generateContent([
    {
      inlineData: {
        data: base64Image,
        mimeType: "image/jpeg",
      },
    },
    "Without explanation, extract text from the image, return empty string if no text is found",
  ]);

  const text = res.response.text();

  console.log(text);
  console.timeEnd("convertImageToTextWithGemini");
  return text;
}

export async function parseExerciseContent(content: string): Promise<{
  content: string;
  direct_answer: boolean;
  is_math_exercise: boolean;
  language: string;
}> {
  console.time("parseExerciseContent");
  const res = await gemini20Flash.generateContent({
    contents: [
      {
        parts: [
          {
            text: `Without explaining, analyze the text content below:
${content}. 

Your response is a JSON of 3 fields: 
- content (Without explanation, format all mathematical expressions in the text using LaTeX/MathJax syntax. Use $...$ for inline math and $$...$$for display math.)
- is_math_exercise (boolean)
- objective_question (is this a objective question?)
- user_language (the language of the user)`,
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
            description: "is this a objective question/exercise?",
            nullable: false,
          },
          user_language: {
            type: SchemaType.STRING,
            description: "the language of the user (ISO 639-1)",
            nullable: false,
          },
        },
        required: ["content", "is_math_exercise", "objective_question"],
      },
    },
  });
  console.timeEnd("parseExerciseContent");

  const text = res.response.text();
  console.log(text);
  const json = cleanAndParseGeminiResponse(text);
  json.direct_answer = json.objective_question;
  json.language = json.user_language;

  return json;
}

const MATH_PROMPT = `Format all mathematical expressions in my text using Katex syntax. Ensure all inline math should be wrapped in \\(...\\) and display math should be wrapped in \\[...\\].`;

function getQuickSolveMessages(question: Question) {
  let prompt = `Answer the question(s): ${JSON.stringify(question.question)}`;
  if (question.math || question.direct_answer) {
    prompt = `Answer the question(s), explain your answer for each question step by step. Question:${JSON.stringify(
      question.question
    )}`;
  }
  console.log(prompt);
  const messages = [
    {
      role: "user",
      content: prompt,
    },
  ] as Groq.Chat.ChatCompletionMessageParam[];

  return messages;
}

export async function quickSolve(question: Question): Promise<string> {
  const messages = getQuickSolveMessages(question);
  console.time("solve");
  const response = await groq.chat.completions.create({
    model: GROQ_MODEL.DEEPSEEK_R1,
    messages,
    reasoning_format: "hidden",
    max_completion_tokens: 8000,
  });
  console.timeEnd("solve");

  const content = response.choices[0].message.content || "";
  console.log(content);
  const translatedContent = await ensureQuickSolveTranslation(
    question,
    content,
    question.language
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
  
  Your task: Ensure the answer is ${getLanguageName(
    question.language
  )}. Do not change the format or meaning of the output.`;

  if (question.math) {
    prompt += `\n${MATH_PROMPT}`;
  }

  const response = await gemini20Flash.generateContent([{ text: prompt }]);
  return response.response.text();
}

async function ensureQuickSolveTranslation(
  question: Question,
  answer: string,
  language: string
) {
  const answerLanguage = await detectLanguage(answer);
  if (
    answerLanguage === language &&
    !(question.direct_answer || question.math)
  ) {
    return answer;
  }

  let prompt = `Question: ${JSON.stringify(question.question)}.

Answer: ${answer}.`;

  if (question.direct_answer || question.math) {
    prompt += `Remove any unnecessary explanation, just give me the result.`;
  }

  prompt += `\nEnsure the answer ${getLanguageName(language)}.`;

  if (question.math) {
    prompt += `\n${MATH_PROMPT}`;
  }

  console.time("ensureQuickSolveTranslation");
  const response = await gemini20Flash.generateContent([{ text: prompt }]);
  console.timeEnd("ensureQuickSolveTranslation");
  return response.response.text();
}
