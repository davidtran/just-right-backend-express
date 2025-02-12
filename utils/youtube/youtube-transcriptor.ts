import axios from "axios";
import { getYouTubeVideoId } from "../general";

export async function transcribeYoutube(youtubeUrl: string) {
  const id = getYouTubeVideoId(youtubeUrl);
  const response = await axios.get(
    `https://youtube-transcriptor.p.rapidapi.com/transcript?video_id=${id}`,
    {
      headers: {
        "x-rapidapi-ua": "RapidAPI-Playground",
        "x-rapidapi-key": "TayDHG2cqImsh7C3L5CYLVut5ZbOp1lOCHfjsnNtUgZtqRIQ9v",
        "x-rapidapi-host": "youtube-transcriptor.p.rapidapi.com",
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.data || !response.data[0]) {
    throw new Error("No data returned from YouTube Transcriptor");
  }

  const result = response.data[0];
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
