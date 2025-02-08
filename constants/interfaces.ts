export interface IChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface IQuizQuestion {
  question: string;
  answers: string[];
  correct_answer: number;
  explanation?: string;
}

export interface INoteQuestion {
  question: string;
  best_answer: string;
}
