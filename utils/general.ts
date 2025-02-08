export function randomString(length: number = 12): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export function stringEscape(s: string) {
  return s
    ? s
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/\t/g, "\\t")
        .replace(/\v/g, "\\v")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/[\x00-\x1F\x80-\x9F]/g, hex)
    : s;
  function hex(c: string) {
    var v = "0" + c.charCodeAt(0).toString(16);
    return "\\x" + v.substr(v.length - 2);
  }
}

export function containsMathEquation(text: string) {
  const combinedMathRegex =
    /(\d+[\+\-\*\/=])+(\d+)|\b(log|sin|cos|tan)\b|<|>|<=|>=|==|!=/g;
  const matches = text.match(combinedMathRegex);
  const count = matches ? matches.length : 0;
  const percentage = (count / text.length) * 100;
  return percentage > 10;
}

export function trimQuotes(text: string): string {
  // Remove quotes only from start and end of string
  return text.replace(/^["'`]|["'`]$/g, "").trim();
}
