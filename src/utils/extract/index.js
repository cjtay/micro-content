import { PDFFOLDER, CONTENTFOLDER, TMPFOLDER, TREATMENTS_JSON_PATH } from "./config.js";
import { ensureDirs, readJson, writeFileSync } from "./file-utils.js";
import { extractTables } from "./pdf-table-extractor.js";
import { extractText } from "./pdf-text-extractor.js";
import { matchTreatments } from "./treatment-matcher.js";
import { formatSectionsWithSideEffects } from "./section-formatter.js";
import { buildMarkdown } from "./markdown-builder.js";
import fs from "fs-extra";
import path from "path";

ensureDirs([PDFFOLDER, CONTENTFOLDER, TMPFOLDER]);
const treatmentsData = readJson(TREATMENTS_JSON_PATH);
const treatmentNameToLabel = {};
treatmentsData.forEach((t) => {
  treatmentNameToLabel[t.name.toLowerCase()] = t.label;
});
const restLabel = treatmentNameToLabel["rest"] || "Rest";

function extractTitleAndRemove(text, fallback) {
  const lines = text.split("\n");
  let titleLines = [];
  let removalCount = 0;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (titleLines.length === 0) {
      titleLines.push(trimmed);
      removalCount++;
      continue;
    }
    if (trimmed.length < 80 && /^(and|or|with|for|\()/.test(trimmed)) {
      titleLines.push(trimmed);
      removalCount++;
    }
  }
  let title = titleLines.join(" ").replace(/\s+/g, " ").trim();
  if (!title) {
    title = fallback;
  }
  const remainingText = lines.slice(removalCount).join("\n").trim();
  return { title, processedText: remainingText };
}

function extractTreatmentDetails(text) {
  let days = "21";
  let treatmentsRaw = [];
  let treatmentSectionText = "";
  const treatmentSectionRegex = /Treatment details([\s\S]+?)(?=\n\n|\n#|$)/i;
  const match = text.match(treatmentSectionRegex);
  if (match) {
    const sectionText = match[1];
    treatmentSectionText = sectionText;
    const dayMatch = sectionText.match(/(\d+)-day cycle/i);
    if (dayMatch) {
      days = dayMatch[1];
    }
    const bulletLines = sectionText
      .split("\n")
      .filter((l) => /^[-*•]\s+/.test(l.trim()));
    treatmentsRaw = bulletLines.map((l) => l.replace(/^[-*•]\s+/, "").trim());
  }
  return { days, treatmentsRaw, treatmentSectionText };
}

async function processAllPDFs() {
  const files = fs
    .readdirSync(PDFFOLDER)
    .filter((file) => file.toLowerCase().endsWith(".pdf"));
  for (const file of files) {
    try {
      await processPDF(file);
      console.log(`✓ Processed ${file}`);
    } catch (err) {
      console.error(`✗ Error processing ${file}: ${err.message}`);
    }
  }
}

async function processPDF(filename) {
  const filePath = path.join(PDFFOLDER, filename);

  const pilMatch = filename.match(/(PIL-\d{4,5})/i);
  if (!pilMatch)
    throw new Error("Filename does not contain a PIL-XXXXX serial number");
  const pilSerial = pilMatch[1].toUpperCase();
  const outputPath = path.join(CONTENTFOLDER, `${pilSerial}.mdx`);

  const csvPattern = path.join(TMPFOLDER, `${pilSerial}_page{0:D2}.csv`);
  const tablesByPage = await extractTables(filePath, csvPattern);

  const rawText = await extractText(filePath);

  const { title, processedText } = extractTitleAndRemove(rawText, pilSerial);

  const { days, treatmentsRaw, treatmentSectionText } = extractTreatmentDetails(processedText);

  const treatmentsArr = matchTreatments(treatmentsRaw, treatmentNameToLabel, treatmentSectionText);

  if (!treatmentsArr.length) {
    console.warn(
      `⚠️  No recognized treatments found in "${filename}". Skipping file.`
    );
    return;
  }

  let treatmentDetailsSection = "";
  if (treatmentsRaw.length) {
    treatmentDetailsSection = `\n\n**Treatment details:**\n${treatmentsRaw
      .map((t) => `- ${t}`)
      .join("\n")}\n`;
  }

  const markdownBody = `${treatmentDetailsSection}\n${await formatSectionsWithSideEffects(
    processedText,
    tablesByPage
  )}`;

  const slug = pilSerial.toLowerCase();
  const pubDate = new Date().toISOString();
  const frontmatter = `title: "${title.replace(/"/g, '\\"')}"
description: "Information extracted from ${filename}"
slug: "${slug}"
tags: ["pdf", "extracted", "${slug}"]
category: "patient information"
pubDate: ${pubDate}
draft: false
days: "${days}"
treatments: [${treatmentsArr.map((t) => `"${t}"`).join(", ")}]`;

  const markdown = buildMarkdown(frontmatter, title, markdownBody);

  writeFileSync(outputPath, markdown);
}

processAllPDFs().catch(console.error);
