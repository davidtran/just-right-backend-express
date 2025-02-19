import axios from "axios";
import { getYouTubeVideoId } from "../general";
import { detectLanguage } from "../document-processor";

export async function transcribeYoutube(youtubeUrl: string) {
  let result = await fetchTranscript(youtubeUrl);

  if (!result) {
    throw new Error("No data returned from YouTube Transcriptor");
  }

  console.log("Available langs", result.availableLangs);

  const descriptionLanguage = await detectLanguage(result.description);

  if (
    result.availableLangs.length > 1 &&
    descriptionLanguage !== result.availableLangs[0]
  ) {
    if (result.availableLangs.includes(descriptionLanguage)) {
      console.log("Refetch using description language", descriptionLanguage);
      result = await fetchTranscript(youtubeUrl, descriptionLanguage);
    } else {
      console.log("Refetch using default language", "en");
      result = await fetchTranscript(youtubeUrl, "en");
    }
  }

  const { title, transcriptionAsText, transcription } = result;
  const segments = transcription.map((segment: any, index: number) => {
    const nextSegment = transcription[index + 1];
    const end = nextSegment
      ? nextSegment.start - 0.5
      : segment.start + segment.dur;
    return {
      start: segment.start,
      end,
      text: segment.subtitle,
    };
  });

  return {
    title,
    text: transcriptionAsText,
    segments,
  };
}

async function fetchTranscript(
  youtubeUrl: string,
  language?: string,
  retries = 3
) {
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  const id = getYouTubeVideoId(youtubeUrl);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(
        `https://youtube-transcriptor.p.rapidapi.com/transcript`,
        {
          headers: {
            "x-rapidapi-ua": "RapidAPI-Playground",
            "x-rapidapi-key":
              "TayDHG2cqImsh7C3L5CYLVut5ZbOp1lOCHfjsnNtUgZtqRIQ9v",
            "x-rapidapi-host": "youtube-transcriptor.p.rapidapi.com",
            "Content-Type": "application/json",
          },
          params: {
            lang: language,
            video_id: id,
          },
        }
      );

      console.log(`Attempt ${attempt}: Response`, response.data);

      if (response.data && response.data[0]) {
        return response.data[0];
      }

      if (attempt < retries) {
        console.log(
          `No data returned, retrying in 3 seconds... (Attempt ${attempt}/${retries})`
        );
        await delay(3000); // Wait for 3 seconds before retrying
      }
    } catch (error) {
      if (attempt < retries) {
        console.log(
          `Request failed, retrying in 3 seconds... (Attempt ${attempt}/${retries})`
        );
        await delay(3000); // Wait for 3 seconds before retrying
      } else {
        throw error; // Throw the last error if all retries failed
      }
    }
  }

  throw new Error(
    "No data returned from YouTube Transcriptor after multiple attempts"
  );
}
