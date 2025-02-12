import { readFile } from "fs/promises";
import { chunk } from "llm-chunk";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

async function chunkWithLangChain(
  text: string,
  chunkSize = 256,
  chunkOverlap = 50
) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ["\n\n", "\n", " "], // Prioritizing paragraph, then line, then space
  });

  return await splitter.splitText(text);
}

async function run() {
  console.log(__dirname);
  const text = await readFile(__dirname + "/content.txt", "utf-8");
  const chunks = await chunkWithLangChain(text, 300, 100);

  chunks.forEach((chunk) => {
    console.log(chunk.length);
  });
}

run();
