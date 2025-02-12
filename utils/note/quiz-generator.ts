import openai from "../../config/openai";
import { Note } from "../../models/note";
import { Quiz } from "../../models/quiz";
import { findSimilarTexts, generateEmbedding } from "./embedding";
import { IQuizQuestion } from "../../constants/interfaces";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  cleanAndParseGeminiResponse,
  gemini15Flash,
  gemini20Flash,
} from "../../config/gemini";
import { getLanguageName } from "../transcription";
import NoteQuestion from "../../models/note-question";
import { SchemaType } from "@google/generative-ai";

export async function generateQuiz(note: Note): Promise<IQuizQuestion[]> {
  const questions = await collectQuestionsFromSummary(note);
  const quizzes = await Promise.all(
    questions.map(async (quiz: any) => {
      return Quiz.create({
        note_id: note.id,
        ...quiz,
      });
    })
  );

  return quizzes;
}

async function collectQuestionsFromSummary(note: Note) {
  const messages = [
    {
      role: "system",
      content: `Without explaining, generate key questions from the summary. Your response is a JSON array.

Example output:
{
"questions": [{
  "question": "question 1",
  "answers": ["answer 1", "answer 2", "answer 3", "answer 4"],
  "correct_answer": 1 (index of the correct answer)
}, {
  "question": "question 2",
  "answers": ["answer 1", "answer 2", "answer 3", "answer 4"],
  "correct_answer": 0
}]
}
`,
    },
    { role: "user", content: note.content },
  ];
  console.time("generateQuiz");
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages as ChatCompletionMessageParam[],
    response_format: { type: "json_object" },
  });
  console.timeEnd("generateQuiz");

  const content = response.choices[0].message.content;

  if (!content) {
    throw new Error("No content returned from OpenAI");
  }

  const questions = JSON.parse(content).questions;

  if (note.target_language && note.source_language !== note.target_language) {
    const translatedQuestions = await translateQuizArray(note, questions);
    return translatedQuestions;
  }

  return questions;
}

export async function generateQuizWithGemini(note: Note) {
  console.time("generateQuizWithGemini");
  const questions = await NoteQuestion.findAll({
    where: { note_id: note.id },
  });
  const prompt = `Without explaining, generate quiz from these questions and answers: 
  ${JSON.stringify(questions)}

------------------------------     
Your response is a JSON array of quizzes. (${
    note.target_language
      ? getLanguageName(note.target_language)
      : getLanguageName(note.source_language)
  } language)

Example output:
[{
  "question": "question 1",
  "answers": ["short answer 1", "short answer 2", "short answer 3", "short answer 4"],
  "correct_answer": 1 (index of the correct answer)
}]`;
  console.log(prompt);
  const response = await gemini15Flash.generateContent({
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
        role: "user",
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: {
        description: "Quizzes",
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            question: { type: SchemaType.STRING },
            answers: {
              type: SchemaType.ARRAY,
              description: "4 short options for quiz question",
              items: { type: SchemaType.STRING, description: "max 15 words" },
            },
            correct_answer: {
              type: SchemaType.NUMBER,
              description: "index of the correct answer",
            },
          },
          required: ["question", "answers", "correct_answer"],
        },
      },
    },
  });
  console.timeEnd("generateQuizWithGemini");
  const text = response.response.text();
  console.log(text);
  const questionsContent = cleanAndParseGeminiResponse(text);

  return questionsContent;
}

async function translateQuizArray(note: Note, quizzes: any[]) {
  console.time("translateQuizArray");

  const response = await gemini15Flash.generateContent({
    contents: [
      {
        parts: [
          {
            text: `Translate this JSON object to ${
              note.target_language
            }. Return only the translated JSON object without any additional text or explanation.\n\n${JSON.stringify(
              quizzes
            )}
            
            Example output:
            [{"question": "TikTok không cắt đứt quan hệ với ByteDance sẽ phải đối mặt với những hậu quả gì?", "answers": ["Phạt tiền đối với các cửa hàng ứng dụng và nhà cung cấp Internet", "Mất dữ liệu người dùng", "Bị cấm khỏi các cửa hàng ứng dụng", "Tất cả các điều trên"], "correct_answer": 3}]`,
          },
        ],
        role: "user",
      },
    ],
    generationConfig: {
      temperature: 0.2,
    },
  });

  console.timeEnd("translateQuizArray");
  let text = response.response.text();
  if (text.startsWith("```json")) {
    text = text.split("\n")[1];
  }
  if (!text) {
    throw new Error("No content returned from Gemini");
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("Failed to parse Gemini response as JSON");
  }
}

async function translateQuizItem(note: Note, quiz: any) {
  console.time("translateQuizItem");

  const response = await gemini15Flash.generateContent({
    contents: [
      {
        parts: [
          {
            text: `Translate this JSON object to ${
              note.target_language
            }. Return only the translated JSON object without any additional text or explanation.\n\n${JSON.stringify(
              quiz
            )}
            
            Example output:
            {"question": "TikTok không cắt đứt quan hệ với ByteDance sẽ phải đối mặt với những hậu quả gì?", "answers": ["Phạt tiền đối với các cửa hàng ứng dụng và nhà cung cấp Internet", "Mất dữ liệu người dùng", "Bị cấm khỏi các cửa hàng ứng dụng", "Tất cả các điều trên"], "correct_answer": 3}`,
          },
        ],
        role: "user",
      },
    ],
    generationConfig: {
      temperature: 0.1,
    },
  });

  console.timeEnd("translateQuizItem");
  let text = response.response.text();
  if (text.startsWith("```json")) {
    text = text.split("\n")[1];
  }
  if (!text) {
    throw new Error("No content returned from Gemini");
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("Failed to parse Gemini response as JSON");
  }
}

export function shuffleQuizAnswers(
  questions: IQuizQuestion[]
): IQuizQuestion[] {
  const newQuestions = questions.map((question) => {
    // Get the correct answer
    const correctAnswer = question.answers[question.correct_answer];

    // Create array of answer objects with their original indices
    const answersWithIndices = question.answers.map((answer, index) => ({
      answer,
      isCorrect: index === question.correct_answer,
    }));

    // Shuffle the answers array
    for (let i = answersWithIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [answersWithIndices[i], answersWithIndices[j]] = [
        answersWithIndices[j],
        answersWithIndices[i],
      ];
    }

    // Find new index of correct answer
    const newCorrectIndex = answersWithIndices.findIndex(
      (item) => item.isCorrect
    );

    return {
      question: question.question,
      answers: answersWithIndices.map((item) => item.answer),
      correct_answer: newCorrectIndex,
    };
  });

  return newQuestions;
}
