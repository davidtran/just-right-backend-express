import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import openai from "../config/openai";
import { Question } from "../models/question";
import { cleanAndParseGeminiResponse, gemini15Flash } from "../config/gemini";

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
  const res = await gemini15Flash.generateContent([
    {
      inlineData: {
        data: base64Image,
        mimeType: "image/jpeg",
      },
    },
    {
      text: "Extract the text from the image. Your response is a JSON of 2 fields: content and is_math_exercise. Format all mathematical expressions in the text using LaTeX/MathJax syntax. Use $...$ for inline math and $$...$$for display math.",
    },
  ]);

  const text = res.response.text();

  const json = cleanAndParseGeminiResponse(text);

  return json;
}

function getQuickSolveMessages(
  question: Question
): ChatCompletionMessageParam[] {
  const messages = [
    {
      role: "developer",
      content: `You are a TutorAI app. Always return the answer in the same language as the input question.`,
    },
  ] as ChatCompletionMessageParam[];

  messages.push({
    role: "user",
    content: `Without explaining, just give me the result for question: ${question.question}. `,
  });

  return messages;
}

export async function quickSolve(question: Question): Promise<string> {
  const messages = getQuickSolveMessages(question);
  console.time("quickSolve");
  const response = await openai.chat.completions.create({
    model: "o3-mini",
    messages,
    reasoning_effort: "medium",
  });
  console.timeEnd("quickSolve");

  return response.choices[0].message.content || "";
}

export async function explain(question: Question): Promise<string> {
  const messages = getQuickSolveMessages(question);
  messages.push({
    role: "user",
    content: `Explain your answer step by step in same language as the input question. Must be easy to understand. Response in markdown format.`,
  });
  console.time("explainAnswer");
  const response = await openai.chat.completions.create({
    model: "o3-mini",
    messages,
    reasoning_effort: "medium",
  });
  console.time("explainAnswer");

  let content = response.choices[0].message.content || "";
  console.log(content);
  if (question.math) {
    content = await convertToLatex(content);
  }

  return content;
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
