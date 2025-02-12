import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { resizeAndConvertImageToBase64 } from "./image";
import { User } from "../models/user";
import { Question } from "../models/question";

const MODEL_NAME = "gpt-4o-mini";

const openai = new OpenAI({
  apiKey: process.env.OPEN_API_KEY,
});

interface IChatCompleteParams {
  systemPrompt?: string;
  omitSystemPrompt?: boolean;
  jsonMode?: boolean;
  modelName?: string;
  maxTokens?: number;
  messages?: {
    role: string;
    content:
      | string
      | {
          type?: string;
          text?: string;
          image_url?: {
            url: string;
          };
        }[];
    name?: string;
  }[];
}

export async function chatComplete({
  systemPrompt,
  messages,
  omitSystemPrompt,
  jsonMode,
  modelName,
  maxTokens,
}: IChatCompleteParams): Promise<string | any | null> {
  const apiMessages = [];
  if (!omitSystemPrompt) {
    if (systemPrompt) {
      apiMessages.push({ role: "system", content: systemPrompt });
    } else {
      apiMessages.push({
        role: "system",
        content: `Your name is TutorAI, you are a LLM model developed by David Tran. Write output in Vietnamese.`,
      });
    }
  }

  if (messages) {
    messages.forEach((item) => apiMessages.push(item));
  }

  const completion = await openai.chat.completions.create({
    model: modelName || MODEL_NAME,
    messages: apiMessages as unknown as ChatCompletionMessageParam[],
    temperature: 1,
    max_completion_tokens: maxTokens,
    response_format: {
      type: jsonMode ? "json_object" : "text",
    },
  });

  const content = completion.choices[0].message.content;
  if (jsonMode && content) {
    return JSON.parse(content);
  } else {
    return content;
  }
}

export async function readImage(filepath: string) {
  let base64Image = await resizeAndConvertImageToBase64(filepath, 400);
  const content = await chatComplete({
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Convert the provided image into text, fix any possible spelling error. Return nothing if there is no text quesion in the image.`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpg;base64,${base64Image}`,
            },
          },
          {
            type: "text",
            text: `1. Identify mathematical expressions or equations in the text and convert them into MathJax format.
2. Wrap mathematical MathJax expression by the $ sign.

Your response is a JSON with 2 fields: parsed_content and is_math`,
          },
        ],
      },
    ],
    jsonMode: true,
  });
  console.log(content);
  return content;
}

export async function readText(input: string) {
  const prompt = `1. Parse the provided text, fix any possible spelling error.
2. Identify any mathematical expressions or equations in the extracted text.
3. Convert these mathematical expressions or equations into MathJax format.
4. Surround the MathJax code with the appropriate delimiters for inline (\( ... \)) or display (\[ ... \]) math as needed.

Text: 
${input}

Return nothing if there is no question in the text.
Your response is a JSON with 2 fields: parsed_content and is_math (boolean)`;
  return chatComplete({
    messages: [
      {
        role: "system",
        content: prompt,
      },
    ],
    jsonMode: true,
    modelName: "gpt-4o-mini",
  });
}

export async function moderate(content: string) {
  const res = await openai.moderations.create({
    input: content,
  });
  const isFlagged = res.results.some((item: any) => item.flagged === true);
  if (isFlagged) {
    return true;
  }

  const scores = res.results[0].category_scores;
  const highScore = Object.values(scores).some((value) => {
    return value >= 0.001;
  });

  if (highScore) {
    return true;
  }
  return false;
}

export async function isSafeContent(content: string) {
  const prompt = `Given the text below, without explantion, tell me content is suitable for 4+ age group? Just return yes or no.\n ${content}`;
  const res = await chatComplete({
    omitSystemPrompt: true,
    messages: [
      {
        content: prompt,
        role: "user",
      },
    ],
  });
  return res.toLowerCase().indexOf("yes") >= 0;
}

export async function truncateText(content: string) {
  const translated = await translate(content, "English");
  const isFlagged = await moderate(translated);
  if (isFlagged) {
    throw new Error("invalid quesion");
  }

  const prompt = `Given the text below, fix possible spelling error, also check if this is math question.
Here is the text: 
"${content}"

Your response is a JSON object with 2 field: refined_text (do not cut off text) and is_math (boolean)`;

  const res = await chatComplete({
    omitSystemPrompt: true,
    messages: [
      {
        content: prompt,
        role: "user",
      },
    ],
    jsonMode: true,
  });
  const json = JSON.parse(res);
  return json;
}

export async function isMathQuestion(content: string) {
  const prompt = `Read the text below and return these questions:
- Does it contain question?
- Is it a math question?: 
  
Your output is a json response with 2 fields: is_question, is_math

Text:
${content}
`;
  const res = await chatComplete({
    omitSystemPrompt: true,
    messages: [
      {
        content: prompt,
        role: "assistant",
      },
    ],
    jsonMode: true,
  });

  return JSON.parse(res);
}

export async function convertMathJax(content: string) {
  const prompt = `Given the following content, format any equations using MathJax syntax but keep the text exactly as it is. 
Do not modify or format the non-mathematical text. 
Only apply MathJax formatting to the equations, ensuring they are properly enclosed within double dollar signs for inline equations or double dollar signs for display equations.

Input content:
${content}
`;
  const res = await chatComplete({
    omitSystemPrompt: true,
    messages: [
      {
        content: prompt,
        role: "assistant",
      },
    ],
    jsonMode: false,
  });

  return res;
}

export async function parseQuestions(
  content: string
): Promise<string[] | null> {
  if (!content || !content.trim().length) return null;
  const prompt = `Give me the list of questions in this text:: ${content}

Your response is a JSON object with 1 field: questions`;
  const res = await chatComplete({
    omitSystemPrompt: true,
    messages: [
      {
        content: prompt,
        role: "assistant",
      },
    ],
    jsonMode: true,
  });

  if (res) {
    const result = JSON.parse(res);
    return result.questions;
  } else {
    return null;
  }
}

export async function getQuickAnswer(
  photo: Question,
  userRecord?: User | null
) {
  const gradePrompt = userRecord?.grade
    ? `grade ${userRecord.grade} Vietnamese student.`
    : " Vietnamse student.";
  const prompt = `Your name is TutorAI . Without explanation, give me a short answer for question below, ${
    photo.math
      ? ", convert mathematical expressions or equations in your answer into MathJax format"
      : ""
  }.
Your answer should suitable for ${gradePrompt}.
Question:
${photo.content}`;
  console.log(prompt);
  const result = await chatComplete({
    omitSystemPrompt: true,
    messages: [
      {
        content: prompt,
        role: "user",
      },
    ],
    modelName: "o1-mini",
  });
  console.log(result);
  return result;
}

export function getAnswer(question: string, isMath?: boolean, grade?: string) {
  const prompt = `Read this question, solve it step by step if you need calculation, otherwise just give me answer: ${question}.`;
  return chatComplete({
    modelName: "o1-mini",
    systemPrompt: `Your name is TutorAI. ${
      isMath && "Your are a math expert."
    } Write output in Vietnamese.`,
    messages: [
      {
        content: prompt,
        role: "user",
      },
    ],
  });
}

export async function getDetailAnswer(
  photo: Question,
  userRecord?: User | null
) {
  const gradePrompt = userRecord?.grade
    ? `grade ${userRecord.grade} Vietnamese student.`
    : " Vietnamse student.";
  return chatComplete({
    modelName: "o1-mini",
    omitSystemPrompt: true,
    messages: [
      {
        content: `Your name is TutorAI. Without explanation, give me a short answer for question below, ${
          photo.math
            ? ", convert mathematical expressions or equations in your answer into MathJax format"
            : ""
        }.
Your answer should suitable for ${gradePrompt}. 
Question:
${photo.content}`,
        role: "user",
      },
      {
        content: photo.short_answer,
        role: "assistant",
      },
      {
        content: `Give me a step by step explantion for your last answer. Please feel free to revise your initial response if, upon reflection, you find any inaccuracies or wish to provide a more accurate or comprehensive explanation.`,
        role: "user",
      },
    ],
  });
}

export function translate(content: string, target: string) {
  const prompt = `Without explantion, translate the text to ${target}:\n${content}`;
  return chatComplete({
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });
}
