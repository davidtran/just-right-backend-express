import axios from "axios";
import { createWriteStream } from "fs";
import { promises as fs } from "fs";
import path from "path";

export async function downloadAudio(
  url: string,
  outputPath?: string
): Promise<string> {
  try {
    // Generate a filename if outputPath is not provided
    if (!outputPath) {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      outputPath = path.join(
        __dirname,
        "..",
        "temp",
        `audio_${timestamp}_${randomString}.mp3`
      );
    }

    // Ensure the directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Download file with axios
    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
    });

    // Create write stream
    const writer = createWriteStream(outputPath);

    // Pipe the response data to the file
    response.data.pipe(writer);

    // Return promise that resolves when the file is written
    return new Promise((resolve, reject) => {
      //@ts-ignore
      writer.on("finish", () => resolve(outputPath));
      writer.on("error", reject);
    });
  } catch (error) {
    console.error("Error downloading audio:", error);
    throw error;
  }
}
