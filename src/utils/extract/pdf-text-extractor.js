import AsposePdf from "asposepdfnodejs";

export async function extractText(filePath) {
  const asposePdfModule = await AsposePdf();
  const textJson = asposePdfModule.AsposePdfExtractText(filePath);
  if (textJson.errorCode !== 0) throw new Error(textJson.errorText);
  return cleanExtractedText(textJson.extractText);
}

function cleanExtractedText(text) {
  let cleaned = text.replace(/\r\n?/g, "\n").replace(/\f/g, "\n\n");
  cleaned = cleaned.replace(/^[ \t]+|[ \t]+$/gm, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  const unwantedPhrases = ["National University Cancer Institute", "Singapore"];
  cleaned = cleaned
    .split("\n")
    .filter((line) => !unwantedPhrases.some((phrase) => line.includes(phrase)))
    .join("\n");
  return cleaned.trim();
}
