import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export enum GROQ_MODEL {
  DEEPSEEK_R1 = "deepseek-r1-distill-llama-70b",
  WHISPER_LARGE_V3_TURBO = "whisper-large-v3-turbo",
}

export default groq;
