const adjectives = [
  "Happy",
  "Clever",
  "Brave",
  "Quiet",
  "Swift",
  "Wise",
  "Gentle",
  "Bold",
  "Proud",
  "Kind",
  "Calm",
  "Bright",
  "Wild",
  "Noble",
  "Pure",
];

const nouns = [
  "Panda",
  "Cloud",
  "Tiger",
  "River",
  "Star",
  "Eagle",
  "Ocean",
  "Phoenix",
  "Dragon",
  "Wolf",
  "Moon",
  "Forest",
  "Mountain",
  "Lion",
  "Bear",
];

export function generateRandomName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 999) + 1;

  return `${adjective}${noun}${number}`;
}
