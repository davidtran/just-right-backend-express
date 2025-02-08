import { OpenAI } from "openai";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

export enum DEEPSEEK_MODEL {
  DEEPSEEK_CHAT = "deepseek-chat",
  DEEPSEEK_R1 = "deepseek-reasoner",
}

export default deepseek;
