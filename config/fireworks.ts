import { OpenAI } from "openai";

const fireworks = new OpenAI({
  apiKey: process.env.FIREWORKS_API_KEY,
  baseURL: "https://api.fireworks.ai/inference/v1",
});

export enum FireworksModels {
  LLAMA_V3P3_70B_INSTRUCT = "accounts/fireworks/models/llama-v3p3-70b-instruct",
  DEEP_SEEK_R1 = "accounts/fireworks/models/deepseek-r1",
}

export default fireworks;
