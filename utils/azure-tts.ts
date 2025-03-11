import axios from "axios";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { uploadObject } from "./cdn";
import { convertMarkdownToSpeechText } from "./markdown-to-speech-text";
import { getLanguageName } from "./transcription";

// Azure TTS configuration
const AZURE_REGION = process.env.AZURE_REGION || "eastus";
const AZURE_KEY = process.env.AZURE_TTS_KEY;
const AZURE_TTS_ENDPOINT = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

// Updated voice mapping with one line per language/locale
const voiceMapping = {
  af: "af-ZA-AdriNeural",
  am: "am-ET-MekdesNeural",
  ar: "ar-SA-ZariyahNeural",
  as: "as-IN-YashicaNeural",
  az: "az-AZ-BanuNeural",
  bg: "bg-BG-KalinaNeural",
  bn: "bn-IN-TanishaaNeural",
  bs: "bs-BA-VesnaNeural",
  ca: "ca-ES-JoanaNeural",
  cs: "cs-CZ-VlastaNeural",
  cy: "cy-GB-NiaNeural",
  da: "da-DK-ChristelNeural",
  de: "de-DE-KatjaNeural",
  el: "el-GR-AthinaNeural",
  en: "en-US-JennyNeural",
  es: "es-ES-ElviraNeural",
  et: "et-EE-AnuNeural",
  eu: "eu-ES-AinhoaNeural",
  fa: "fa-IR-DilaraNeural",
  fi: "fi-FI-SelmaNeural",
  fil: "fil-PH-BlessicaNeural",
  fr: "fr-FR-DeniseNeural",
  ga: "ga-IE-OrlaNeural",
  gl: "gl-ES-SabelaNeural",
  gu: "gu-IN-DhwaniNeural",
  he: "he-IL-HilaNeural",
  hi: "hi-IN-SwaraNeural",
  hr: "hr-HR-GabrijelaNeural",
  hu: "hu-HU-NoemiNeural",
  hy: "hy-AM-AnahitNeural",
  id: "id-ID-GadisNeural",
  is: "is-IS-GudrunNeural",
  it: "it-IT-ElsaNeural",
  ja: "ja-JP-NanamiNeural",
  jv: "jv-ID-SitiNeural",
  ka: "ka-GE-EkaNeural",
  kk: "kk-KZ-AigulNeural",
  km: "km-KH-SreymomNeural",
  kn: "kn-IN-SapnaNeural",
  ko: "ko-KR-SunHiNeural",
  lo: "lo-LA-KeomanyNeural",
  lt: "lt-LT-OnaNeural",
  lv: "lv-LV-EveritaNeural",
  mk: "mk-MK-MarijaNeural",
  ml: "ml-IN-SobhanaNeural",
  mn: "mn-MN-YesuiNeural",
  mr: "mr-IN-AarohiNeural",
  ms: "ms-MY-YasminNeural",
  mt: "mt-MT-GraceNeural",
  my: "my-MM-NilarNeural",
  nb: "nb-NO-PernilleNeural",
  ne: "ne-NP-HemkalaNeural",
  nl: "nl-NL-FennaNeural",
  or: "or-IN-SubhasiniNeural",
  pa: "pa-IN-VaaniNeural",
  pl: "pl-PL-AgnieszkaNeural",
  ps: "ps-AF-LatifaNeural",
  pt: "pt-BR-FranciscaNeural",
  ro: "ro-RO-AlinaNeural",
  ru: "ru-RU-SvetlanaNeural",
  si: "si-LK-ThiliniNeural",
  sk: "sk-SK-ViktoriaNeural",
  sl: "sl-SI-PetraNeural",
  so: "so-SO-UbaxNeural",
  sq: "sq-AL-AnilaNeural",
  sr: "sr-RS-SophieNeural",
  su: "su-ID-TutiNeural",
  sv: "sv-SE-SofieNeural",
  sw: "sw-KE-ZuriNeural",
  ta: "ta-IN-PallaviNeural",
  te: "te-IN-ShrutiNeural",
  th: "th-TH-PremwadeeNeural",
  tr: "tr-TR-EmelNeural",
  uk: "uk-UA-PolinaNeural",
  ur: "ur-PK-UzmaNeural",
  uz: "uz-UZ-MadinaNeural",
  vi: "vi-VN-HoaiMyNeural",
  zh: "zh-CN-XiaoxiaoNeural",
  zu: "zu-ZA-ThandoNeural",
};

// Get the appropriate voice for a language
const getVoiceForLanguage = (languageCode: string): string => {
  // Extract the base language code (e.g., 'en' from 'en-US')
  const baseCode = languageCode.split("-")[0].toLowerCase();
  return (
    voiceMapping[baseCode as keyof typeof voiceMapping] || "en-US-JennyNeural"
  ); // Default to English
};

// Generate speech from text using Azure TTS
export const generateSpeech = async (
  text: string,
  language: string
): Promise<{ filePath: string; durationSeconds: number }> => {
  if (!AZURE_KEY) {
    throw new Error("Azure TTS key is not configured");
  }

  try {
    const voice = getVoiceForLanguage(language);
    const outputFileName = `${uuidv4()}.mp3`;
    const outputDir = path.join(process.cwd(), "temp");

    // Ensure temp directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, outputFileName);

    // SSML template for Azure TTS
    const ssml = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${language}">
      <voice name="${voice}">
        <mstts:express-as style="general">
          ${text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;")}
        </mstts:express-as>
      </voice>
    </speak>`;

    const response = await axios({
      method: "post",
      url: AZURE_TTS_ENDPOINT,
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-160kbitrate-mono-mp3",
        "User-Agent": "JustRightAI",
      },
      data: ssml,
      responseType: "arraybuffer",
    });

    // Write the audio file
    fs.writeFileSync(outputPath, response.data);

    // Calculate approximate duration (rough estimate: 150 words per minute)
    const wordCount = text.split(/\s+/).length;
    const durationSeconds = Math.ceil(wordCount / 2.5); // 150 words per minute = 2.5 words per second

    return { filePath: outputPath, durationSeconds };
  } catch (error) {
    console.error("Error generating speech:", error);
    throw new Error(
      `Failed to generate speech: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

// Process note summary to audio file
export const processNoteToAudio = async (
  speechText: string,
  language: string
): Promise<{ fileUrl: string; durationSeconds: number }> => {
  try {
    // Generate speech audio file
    const { filePath, durationSeconds } = await generateSpeech(
      speechText,
      language
    );

    // Upload to CDN
    const fileUrl = await uploadObject(filePath);

    if (!fileUrl) {
      throw new Error("Failed to upload audio file to CDN");
    }

    // Clean up temp file
    fs.unlinkSync(filePath);

    return { fileUrl, durationSeconds };
  } catch (error) {
    console.error("Error processing note to audio:", error);
    throw error;
  }
};
