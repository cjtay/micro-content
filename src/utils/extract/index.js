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

/**
 * Parse day numbers from a string like "1, 8 and 15" or "2 to 21"
 * @param {string} dayString - String containing day information
 * @param {number} totalDays - Total number of days in the cycle
 * @returns {number[]} Array of day numbers
 */
function parseDayNumbers(dayString, totalDays) {
  if (!dayString) return [];
  
  // Replace 'and' with commas for consistent splitting
  dayString = dayString.replace(/\s+and\s+/gi, ', ');
  
  const days = new Set();
  const parts = dayString.split(',').map(p => p.trim());
  
  for (const part of parts) {
    // Handle ranges like "2 to 21"
    const rangeMatch = part.match(/(\d+)\s+to\s+(\d+)/i);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      for (let i = start; i <= Math.min(end, totalDays); i++) {
        days.add(i);
      }
    } 
    // Handle single days like "1" or "8"
    else if (/^\d+$/.test(part)) {
      const day = parseInt(part, 10);
      if (day <= totalDays) {
        days.add(day);
      }
    }
  }
  
  return Array.from(days).sort((a, b) => a - b);
}

/**
 * Process treatment schedules with exceptions
 */
function processRestWithExceptions(text, totalDays) {
  const restDays = new Set();
  const exceptionDays = new Set();
  
  // Find rest period ranges
  const restRangePattern = /[Ff]rom\s+days?\s+(\d+)\s+to\s+(\d+).*?(?:won't|will not|no)\s+.*?(?:treatment|therapy)/i;
  const restMatch = text.match(restRangePattern);
  
  if (restMatch) {
    const startDay = parseInt(restMatch[1], 10);
    const endDay = parseInt(restMatch[2], 10);
    
    for (let day = startDay; day <= Math.min(endDay, totalDays); day++) {
      restDays.add(day);
    }
    
    // Find exceptions to the rest period
    const exceptPattern = /[Ee]xcept\s+(?:on|for)?\s+days?\s+([\d\s,]+(?:and|to)[\d\s,]+|\d+)/i;
    const exceptMatch = text.match(exceptPattern);
    
    if (exceptMatch) {
      const exceptionDayNumbers = parseDayNumbers(exceptMatch[1], totalDays);
      exceptionDayNumbers.forEach(day => {
        exceptionDays.add(day);
        restDays.delete(day); // Remove exception days from rest days
      });
    }
  }
  
  return {
    restDays: Array.from(restDays).sort((a, b) => a - b),
    exceptionDays: Array.from(exceptionDays).sort((a, b) => a - b)
  };
}

/**
 * Extract complete treatment schedule from text
 */
function extractScheduleFromText(treatmentSectionText, totalDays, treatmentsArr) {
  // Initialize schedule with empty treatment arrays for each day
  const schedule = Array.from({ length: totalDays }, (_, i) => ({
    day: i + 1,
    treatments: []
  }));
  
  if (!treatmentSectionText || !treatmentsArr || treatmentsArr.length === 0) {
    console.warn("Missing treatment text or treatments array");
    schedule.forEach(dayInfo => {
      dayInfo.treatments = ["Rest"];
    });
    return schedule;
  }
  
  // Clean up the text for better parsing
  const cleanedText = treatmentSectionText
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // First, find all rest periods - we'll process these last
  const restPeriods = [];
  const restPattern = /(?:on|from)\s+days?\s+(\d+)(?:\s+to\s+(\d+))?.+?(?:won't|will not|no)\s+.*?(?:treatment|therapy)/gi;
  let restMatch;
  
  while ((restMatch = restPattern.exec(cleanedText)) !== null) {
    const startDay = parseInt(restMatch[1], 10);
    const endDay = restMatch[2] ? parseInt(restMatch[2], 10) : startDay;
    restPeriods.push({ start: startDay, end: endDay });
  }
  
  // Process each treatment to find its schedule
  for (const treatment of treatmentsArr) {
    if (treatment === "Rest") continue; // Skip "Rest" as we'll handle it separately
    
    // Try multiple pattern matching strategies for each treatment
    
    // Pattern 1: "day(s) X to Y" format
    const dayRangePattern = new RegExp(
      `${treatment}.*?(?:on|from)\\s+days?\\s+(\\d+)\\s+to\\s+(\\d+)`, 'i'
    );
    const dayRangeMatch = cleanedText.match(dayRangePattern);
    
    if (dayRangeMatch) {
      const startDay = parseInt(dayRangeMatch[1], 10);
      const endDay = parseInt(dayRangeMatch[2], 10);
      
      for (let day = startDay; day <= Math.min(endDay, totalDays); day++) {
        if (!schedule[day-1].treatments.includes(treatment)) {
          schedule[day-1].treatments.push(treatment);
        }
      }
      continue; // Found a match for this treatment, move to next one
    }
    
    // Pattern 2: "day X, Y, and Z" format
    const specificDaysPattern = new RegExp(
      `${treatment}.*?(?:on|from)\\s+days?\\s+(\\d+(?:[,\\s]+\\d+)*(?:\\s+(?:and|to)\\s+\\d+)?)`, 'i'
    );
    const specificDaysMatch = cleanedText.match(specificDaysPattern);
    
    if (specificDaysMatch) {
      const dayStr = specificDaysMatch[1].replace(/\s+and\s+/i, ', ');
      const days = dayStr.split(/[,\s]+/).filter(d => /^\d+$/.test(d)).map(d => parseInt(d, 10));
      
      for (const day of days) {
        if (day <= totalDays && !schedule[day-1].treatments.includes(treatment)) {
          schedule[day-1].treatments.push(treatment);
        }
      }
    }
  }
  
  // Process rest periods after all treatments are assigned
  for (const period of restPeriods) {
    for (let day = period.start; day <= Math.min(period.end, totalDays); day++) {
      schedule[day-1].treatments = ["Rest"];
    }
  }
  
  // Look for days where no treatment is specified - mark as Rest
  for (let i = 0; i < schedule.length; i++) {
    if (schedule[i].treatments.length === 0) {
      // If the day isn't specified in any treatment pattern, assume Rest
      schedule[i].treatments = ["Rest"];
    }
  }
  
  return schedule;
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
      `⚠️ No recognized treatments found in "${filename}". Skipping file.`
    );
    return;
  }

  // Extract the treatment schedule
  const daysNum = parseInt(days, 10);
  const treatmentSchedule = extractScheduleFromText(treatmentSectionText, daysNum, treatmentsArr);

  // Format the treatment schedule for YAML frontmatter
  const treatmentScheduleYaml = treatmentSchedule.map(day => 
    `  { day: ${day.day}, treatments: [${day.treatments.map(t => `"${t}"`).join(", ")}] }`
  ).join(",\n");

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
days: ${daysNum}
treatments: [${treatmentsArr.map((t) => `"${t}"`).join(", ")}]
treatmentSchedule: [
${treatmentScheduleYaml}
]`;

  const markdown = buildMarkdown(frontmatter, title, markdownBody);
  writeFileSync(outputPath, markdown);
}

processAllPDFs().catch(console.error);
