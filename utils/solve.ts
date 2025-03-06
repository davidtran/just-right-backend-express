import openai from "../config/openai";
import { Question } from "../models/question";
import {
  cleanAndParseGeminiResponse,
  gemini15Flash,
  gemini20Flash,
  gemini20FlashThinking,
} from "../config/gemini";
import groq, { GROQ_MODEL } from "../config/groq";
import Groq from "groq-sdk";
import { SchemaType } from "@google/generative-ai";
import { detectLanguage } from "./document-processor";
import { getLanguageName } from "./transcription";

export async function convertImageToTextWithOpenAI(base64Image: string) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
          {
            type: "text",
            text: "Without explanation, extract question text from the image, return empty string if no question text is found. Fix spelling mistakes.",
          },
        ],
      },
    ],
  });
  return res.choices[0].message.content;
}

export async function convertImageToTextWithGemini(base64Image: string) {
  console.time("convertImageToTextWithGemini");
  const res = await gemini20Flash.generateContent([
    {
      inlineData: {
        data: base64Image,
        mimeType: "image/jpeg",
      },
    },
    "Without explanation, extract question text from the image, return empty string if no text or question text  is found. Fix spelling mistakes.",
  ]);

  const text = res.response.text();

  console.log(text);
  console.timeEnd("convertImageToTextWithGemini");
  return text;
}

export async function parseExerciseContent(content: string): Promise<{
  content: string;
  direct_answer: boolean;
  math: boolean;
  language: string;
}> {
  console.log(content);
  console.time("parseExerciseContent");
  const res = await gemini20Flash.generateContent({
    contents: [
      {
        parts: [
          {
            text: `Without explaining, analyze the text content below:
${content}. 

Your response is a JSON of 3 fields: 
- math
- objective_question 
- user_language`,
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
          math: {
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
        required: ["math", "objective_question", "user_language"],
      },
    },
  });
  console.timeEnd("parseExerciseContent");

  const text = res.response.text();
  const json = cleanAndParseGeminiResponse(text);
  json.direct_answer = json.objective_question;
  json.language = json.user_language;
  json.content = content;

  return json;
}

const MATH_PROMPT = `Format all mathematical expressions in my text using Katex syntax. Ensure all inline math should be wrapped in \\(...\\) and display math should be wrapped in \\[...\\].`;

function getQuickSolveMessages(question: Question) {
  let prompt = `Answer the question(s): ${JSON.stringify(question.question)}`;
  if (question.math) {
    prompt += ` with step by step explanation.`;
  }
  return prompt;
}

// Add a timestamp tracker for rate limiting
let lastGeminiThinkingCall = 0;
const GEMINI_RATE_LIMIT_WINDOW = 60000; // 60 seconds in milliseconds

export async function quickSolve(question: Question): Promise<string> {
  const messages = getQuickSolveMessages(question);
  console.log(messages);
  console.time("solve");

  let content = "";

  // Use different models based on question difficulty
  if (!question.math) {
    console.log("Solving simple question with OpenAI GPT-4o");
    // For simple questions, use Gemini Flash 2.0
    const response = await gemini20Flash.generateContent({
      contents: [{ parts: [{ text: messages }], role: "user" }],
    });

    console.log(JSON.stringify(response, null, 2));

    // const response = await openai.chat.completions.create({
    //   model: "gpt-4o",
    //   messages: [
    //     {
    //       role: "user",
    //       content: messages,
    //     },
    //   ],
    // });

    // content = response.choices[0].message.content || "";

    content = response.response.text();
  } else {
    // For hard questions, try Gemini Flash thinking with rate limit protection
    const currentTime = Date.now();
    const timeSinceLastCall = currentTime - lastGeminiThinkingCall;

    try {
      // Check if we need to wait due to rate limiting
      if (timeSinceLastCall < GEMINI_RATE_LIMIT_WINDOW) {
        console.log(`Rate limit window active. Using Groq DEEPSEEK fallback.`);
        throw new Error("Rate limit window active");
      }

      console.log("Solving hard question with Gemini Flash thinking");

      // Try using Gemini Flash thinking
      const response = await gemini20FlashThinking.generateContent({
        contents: [{ parts: [{ text: messages }], role: "user" }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 20000,
        },
      });

      // Update the last call timestamp
      lastGeminiThinkingCall = Date.now();
      content = response.response.text();
    } catch (error) {
      console.log(
        "Error with Gemini Flash thinking, falling back to Groq DEEPSEEK:",
        error
      );

      // Fallback to Groq DEEPSEEK
      const response = await groq.chat.completions.create({
        model: GROQ_MODEL.DEEPSEEK_R1,
        messages: [{ role: "user", content: messages }],
        reasoning_format: "hidden",
        max_completion_tokens: 12000,
        temperature: 0.6,
        top_p: 0.95,
      });

      content = response.choices[0].message.content || "";
    }
  }

  if (!content) {
    throw new Error("No content found");
  }

  console.timeEnd("solve");

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
  let prompt = `Text content: ${answer}. 
  
  Your task: Ensure the output is in easy to understand ${getLanguageName(
    question.language
  )} language. Do not write any introduction for your task.`;

  if (question.math) {
    prompt += `\n${MATH_PROMPT}`;
  }

  const response = await gemini20Flash.generateContent([{ text: prompt }]);
  return response.response.text();
}

// export async function solveSimpleQuestionWithGemini(
//   question: Question
// ): Promise<string> {
//   console.time("solveSimpleQuestionWithGemini");
//   const response = await gemini20Flash.generateContent([{ text: prompt }]);
//   console.timeEnd("solveSimpleQuestionWithGemini");
//   return response.response.text();
// }

// export async function reasoningWithGemini(question: Question): Promise<string> {
//   console.time("solveWithGemini");

//   let prompt = `Answer the question(s): ${JSON.stringify(question.question)}`;
//   if (question.math || question.direct_answer) {
//     prompt += ` with step by step explanation.`;
//   }
//   prompt += " Your response and thinking in English.";

//   const response = await gemini20Flash.generateContent([{ text: prompt }]);
//   const content = response.response.text();

//   console.timeEnd("solveWithGemini");

//   const translatedContent = await ensureQuickSolveTranslation(
//     question,
//     content,
//     question.language
//   );

//   question.short_answer = translatedContent;
//   question.detail_answer = content;

//   return translatedContent;
// }

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
-----------
Answer: ${answer}.`;

  if (question.direct_answer || question.math) {
    prompt += `Remove any unnecessary explanation, just give me the result.`;
  }

  prompt += `\n
-------------
Your task:Ensure the answer in ${getLanguageName(
    language
  )} language. Do not write any introduction for your task.`;

  if (question.math) {
    prompt += `\n${MATH_PROMPT}`;
  }

  console.log(prompt);

  console.time("ensureQuickSolveTranslation");
  const response = await gemini20Flash.generateContent([{ text: prompt }]);
  console.timeEnd("ensureQuickSolveTranslation");
  return response.response.text();
}
