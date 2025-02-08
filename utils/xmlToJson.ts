export interface TranscriptSegment {
  start: number;
  dur: number;
  text: string;
}

export interface TranscriptJSON {
  transcript: TranscriptSegment[];
}

export function xmlToJson(xml: string): TranscriptJSON {
  // Create a DOMParser to parse the XML string
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, "text/xml");

  // Get all text elements
  const textElements = xmlDoc.getElementsByTagName("text");

  // Convert to array of transcript segments
  const transcript: TranscriptSegment[] = Array.from(textElements).map(
    (element) => ({
      start: parseFloat(element.getAttribute("start") || "0"),
      dur: parseFloat(element.getAttribute("dur") || "0"),
      text: element.textContent || "",
    })
  );

  return { transcript };
}
