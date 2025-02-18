import { Note } from "../../models/note";
import { readFile } from "fs/promises";
import pdf from "pdf-parse";
import { detectLanguage } from "../../utils/document-processor";
import { uploadObject } from "../../utils/cdn";

export const preprocessPdfNote = async (note: Note, pdfFile: string) => {
  const text = await extractTextFromPdf(pdfFile);
  if (!text || text.length < 200) {
    throw new Error("No text found");
  }
  console.log("text", text);
  const sourceLanguage = await detectLanguage(text);

  note.source_language = sourceLanguage;
  note.content = text || "";

  const url = await uploadObject(pdfFile);
  if (url) {
    note.resource_urls = [url];
  }
  await note.save();
};

async function extractTextFromPdf(pdfPath: string): Promise<string> {
  try {
    // Read the PDF file
    const dataBuffer = await readFile(pdfPath);

    // Parse options
    const options = {
      pagerender: function (pageData: any) {
        // Return text and normalize spacing
        return pageData.getTextContent().then(function (textContent: any) {
          let lastY,
            text = "";
          for (let item of textContent.items) {
            if (lastY == item.transform[5] || !lastY) {
              text += item.str;
            } else {
              text += "\n" + item.str;
            }
            lastY = item.transform[5];
          }
          return text;
        });
      },
    };

    // Parse PDF
    const data = await pdf(dataBuffer, options);

    // Clean up the extracted text
    let text = data.text
      // Remove multiple spaces
      .replace(/\s+/g, " ")
      // Remove multiple newlines
      .replace(/\n+/g, "\n")
      // Remove empty lines
      .replace(/^\s*[\r\n]/gm, "")
      .trim();

    return text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error(
      `Failed to extract text from PDF: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
