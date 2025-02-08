import OpenAI from 'openai';
import {
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
} from 'openai/resources';

const MODEL_NAME = 'meta-llama/Llama-3-70b-chat-hf';

const anyscale = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY,
  baseURL: 'https://api.together.xyz/v1',
});

interface IChatCompleteParams {
  systemPrompt?: string;
  omitSystemPrompt?: boolean;
  jsonMode?: boolean;
  messages?: {
    role: string;
    content: string;
    name?: string;
  }[];
}

export async function chatComplete({
  systemPrompt,
  messages,
  omitSystemPrompt,
  jsonMode,
}: IChatCompleteParams): Promise<string | any | null> {
  const apiMessages = [];
  if (!omitSystemPrompt) {
    if (systemPrompt) {
      apiMessages.push({ role: 'system', content: systemPrompt });
    } else {
      apiMessages.push({
        role: 'system',
        content: `Your name is TutorAI, you are a LLM model developed by David Tran. Write output in Vietnamese. Do not answer any explicit or 17+ question.`,
      });
    }
  }

  if (messages) {
    messages.forEach((item) => apiMessages.push(item));
  }

  const completion = await anyscale.chat.completions.create({
    model: MODEL_NAME,
    messages: apiMessages as unknown as ChatCompletionMessageParam[],
    temperature: 0.7,    
  });

  console.log(completion, apiMessages);

  return completion.choices[0].message.content;
}

function getQuickAnswerPrompt(question: string) {
  const prompt = `Without explanation, give me a immediate answer for this question: ${question}`;
  return prompt;
}

export async function getQuickAnswer(question: string) {
  const prompt = getQuickAnswerPrompt(question);
  return chatComplete({
    messages: [
      {
        content: prompt,
        role: 'user',
      },
    ],    
  });
}

export function getDetailAnswer(question: string, lastAnwer: string) {
  const prompt = `Give me a step by step explantion for your answer`;
  return chatComplete({
    messages: [
      {
        content: getQuickAnswerPrompt(question),
        role: 'user',
      },
      {
        content: lastAnwer,
        role: 'assistant',
      },
      {
        content: `Give me a step by step explantion for your last answer.`,
        role: 'user',
      },
    ],
  });
}
