import { readFile } from "fs/promises";
import { chunk } from "llm-chunk";

async function run() {
  console.log(__dirname);
  const text = await readFile(__dirname + "/content.txt", "utf-8");
  const chunks = chunk(text, {
    minLength: 500,
    maxLength: 5000,
    splitter: "sentence", // paragraph | sentence
    overlap: 200,
  });

  console.log(chunks);
}

run();
