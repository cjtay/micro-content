import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import AsposePdf from 'asposepdfnodejs';
import { parse as csvParse } from 'csv-parse/sync';

const PDFFOLDER = './src/utils/pdfs';
const CONTENTFOLDER = './src/content/pil';
const TMPFOLDER = './tmp_pdf_tables';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SECTION_HEADERS = [
  'About the treatment',
  'Treatment details',
  'Side Effects',
  'Common Side Effects',
  'Other Common Side Effects',
  'Occasional Side Effects',
  'Rare Side Effects',
  'Food & Drink',
  'Pregnancy, Contraception and Breastfeeding',
  'Fertility',
  'Immunisations',
  'Alcohol',
  'Exercise'
];

// The fixed disclaimer to always append at the bottom
const FIXED_DISCLAIMER = '> _Patient Information Use and Disclaimer: this is not a complete list of side effects. Always consult your healthcare provider to ensure the information displayed on this page applies to your personal circumstances._';

const CONTACT_SECTION = `
---
## How to contact your Healthcare Team
<span class="text-red-500 font-bold text-xl">
Cancer Line (+65) 9722 0569
</span>

- 8:30 am - 5:30 pm (Mondays - Fridays)
- Closed on Weekends & Public Holidays
- For non-operating hours, weekends, and public holidays, please go to your nearest Emergency Department.

### Contact your healthcare team as soon as possible if:
- You have severe side effects.
- Your side effects aren’t getting any better.
- Your side effects are getting worse.

### Seek medical attention if you develop the following:
- Soon after treatment, signs of an allergic reaction include rashes, face swelling, dizziness, chest tightness, a fast heartbeat, or breathing difficulties.
- Symptoms of an infection include fever (temperature over 38°C), chills, severe sore throat, wet cough (coughing up thick or green phlegm), and cloudy or foul-smelling urine.
- Signs of unusual bleeding, bruising, or dark and sticky stools.
- Feeling unwell (despite not having a fever).`;

fs.ensureDirSync(PDFFOLDER);
fs.ensureDirSync(CONTENTFOLDER);
fs.ensureDirSync(TMPFOLDER);

async function processAllPDFs() {
  const files = fs.readdirSync(PDFFOLDER).filter(file => file.toLowerCase().endsWith('.pdf'));
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

  // --- SERIAL NUMBER LOGIC: Extract the PIL-XXXXX pattern for output filename ---
  const pilMatch = filename.match(/(PIL-\d{4,5})/i);
  if (!pilMatch) throw new Error('Filename does not contain a PIL-XXXXX serial number');
  const pilSerial = pilMatch[1].toUpperCase();
  const outputPath = path.join(CONTENTFOLDER, `${pilSerial}.md`);

  // 1. Extract all tables as CSV files (one per page)
  const asposePdfModule = await AsposePdf();
  const csvPattern = path.join(TMPFOLDER, `${pilSerial}_page{0:D2}.csv`);
  const csvJson = asposePdfModule.AsposePdfTablesToCSV(filePath, csvPattern, "\t");
  let tablesByPage = {};
  if (csvJson.errorCode === 0 && Array.isArray(csvJson.filesNameResult)) {
    for (const csvFile of csvJson.filesNameResult) {
      const pageNum = parseInt(csvFile.match(/page(\d+)\.csv$/)[1], 10);
      const csvContent = fs.readFileSync(csvFile, 'utf8');
      const records = csvParse(csvContent, { delimiter: '\t', skip_empty_lines: true });
      tablesByPage[pageNum] = records;
    }
  }

  // 2. Extract the full text for non-table content
  const textJson = asposePdfModule.AsposePdfExtractText(filePath);
  if (textJson.errorCode !== 0) throw new Error(textJson.errorText);
  let rawText = textJson.extractText;
  rawText = cleanExtractedText(rawText);

  // 3. Parse and structure the content
  const { title, processedText } = extractTitleAndRemove(rawText, pilSerial);
  const { days, treatments } = extractTreatmentDetails(processedText);

  // 4. Format body and insert Markdown table and bullet lists for side effects

  // Render Treatment details as Markdown bullets
  let treatmentDetailsSection = '';
  if (treatments.length) {
    treatmentDetailsSection = `\n\n**Treatment details:**\n${treatments.map(t => `- ${t}`).join('\n')}\n`;
  }

  const markdownBody = `${treatmentDetailsSection}\n${await formatSectionsWithSideEffects(processedText, tablesByPage)}`;

  // 5. Build frontmatter
  const slug = pilSerial.toLowerCase();
  const pubDate = new Date().toISOString();
  const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
description: "Information extracted from ${filename}"
slug: "${slug}"
tags: ["pdf", "extracted", "${slug}"]
category: "patient information"
pubDate: ${pubDate}
draft: false
days: "${days}"
treatments: [${treatments.map((t) => `"${t}"`).join(', ')}]
---`;

  // 6. Write the Markdown file
  // Disclaimer is always appended at the very end, after CONTACT_SECTION
  const markdown = `${frontmatter}

# ${title}

${markdownBody}

${CONTACT_SECTION}

${FIXED_DISCLAIMER}
`;
  fs.writeFileSync(outputPath, markdown);
}

// --- HELPERS ---

function cleanExtractedText(text) {
  let cleaned = text.replace(/\r\n?/g, '\n').replace(/\f/g, '\n\n');
  cleaned = cleaned.replace(/^[ \t]+|[ \t]+$/gm, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  const unwantedPhrases = [
    'National University Cancer Institute',
    'Singapore'
  ];
  cleaned = cleaned
    .split('\n')
    .filter(line => !unwantedPhrases.some(phrase => line.includes(phrase)))
    .join('\n');
  return cleaned.trim();
}

function extractTitleAndRemove(text, fallback) {
  const lines = text.split('\n');
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
  let title = titleLines.join(' ').replace(/\s+/g, ' ').trim();
  if (!title) {
    title = fallback;
  }
  const remainingText = lines.slice(removalCount).join('\n').trim();
  return { title, processedText: remainingText };
}

function extractTreatmentDetails(text) {
  let days = '21';
  let treatments = [];
  const treatmentSectionRegex = /Treatment details([\s\S]+?)(?=\n\n|\n#|$)/i;
  const match = text.match(treatmentSectionRegex);
  if (match) {
    const sectionText = match[1];
    const dayMatch = sectionText.match(/(\d+)-day cycle/i);
    if (dayMatch) {
      days = dayMatch[1];
    }
    // Extract all bullet lines and render as Markdown bullets
    const bulletLines = sectionText.split('\n').filter(l => /^[-*•]\s+/.test(l.trim()));
    treatments = bulletLines.map(l => l.replace(/^[-*•]\s+/, '').trim());
  }
  return { days, treatments };
}

// --- ROBUST SIDE EFFECT SECTION EXTRACTION FIX ---
async function formatSectionsWithSideEffects(text, tablesByPage) {
  const lines = text.split('\n');
  const outputLines = [];
  let currentSection = null;
  let sectionBuffer = [];

  // Map of section headers to markdown headings
  const sectionMap = {
    'common side effects': '### Common Side Effects',
    'other common side effects': '### Other Common Side Effects',
    'occasional side effects': '### Occasional Side Effects',
    'rare side effects': '### Rare Side Effects'
  };

  function flushSection() {
    if (!currentSection) return;
    const heading = sectionMap[currentSection];
    if (heading) outputLines.push(heading);

    // Special handling for Common Side Effects (table)
    if (currentSection === 'common side effects') {
      let tableMd = extractCommonSideEffectsTableFromPages(tablesByPage);
      if (!tableMd) {
        tableMd = extractCommonSideEffectsTableFromText(sectionBuffer);
      }
      if (tableMd) {
        outputLines.push('');
        outputLines.push(tableMd);
        outputLines.push('');
      }
    } else {
      // For other sections, extract and output bullets
      const bullets = extractBulletList(sectionBuffer);
      if (bullets.length) {
        outputLines.push('');
        outputLines.push(...bullets.map(b => `- ${b}`));
        outputLines.push('');
      }
    }
    // Reset
    currentSection = null;
    sectionBuffer = [];
  }

  for (let idx = 0; idx < lines.length; idx++) {
    let line = lines[idx].trim();
    const lower = line.toLowerCase();

    if (sectionMap[lower]) {
      flushSection();
      currentSection = lower;
      continue;
    }
    // If a new section header (not a side effect section), flush current
    if (
      SECTION_HEADERS.some(h => h.toLowerCase() === lower) &&
      !sectionMap[lower]
    ) {
      flushSection();
      outputLines.push(`### ${line}`);
      continue;
    }
    // If in a side effect section, collect all lines until next header
    if (currentSection) {
      sectionBuffer.push(line);
      continue;
    }
    // Default: add as paragraph
    outputLines.push(line);
  }
  flushSection();

  let output = outputLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return output;
}

// Extract bullet points from lines (for Other/Occasional/Rare side effects)
function extractBulletList(lines) {
  const bullets = [];
  for (let line of lines) {
    const m = line.match(/^[-*•]\s*(.+)$/);
    if (m) {
      bullets.push(m[1].trim());
    }
  }
  return bullets;
}

// --- Table extraction helpers (unchanged) ---

function extractCommonSideEffectsTableFromPages(tablesByPage) {
  for (const pageNum of Object.keys(tablesByPage)) {
    const table = tablesByPage[pageNum];
    if (
      table &&
      table.length >= 2 &&
      table[0].length >= 2 &&
      isCommonSideEffectsTable(table)
    ) {
      return csvTableToMarkdown(table);
    }
  }
  return null;
}

function isCommonSideEffectsTable(table) {
  if (!table || table.length < 2) return false;
  const header = table[0].map(cell => cell.toLowerCase().trim());
  return (
    header.includes('common side effect') &&
    header.some(h => h.includes('description'))
  );
}

function extractCommonSideEffectsTableFromText(lines) {
  const rows = [];
  let currentName = null;
  let currentDesc = [];
  for (let line of lines) {
    if (!line.trim()) continue;
    // Heuristic: likely a side effect name if line is title case and not a full sentence
    if (
      /^[A-Z][A-Za-z0-9 ()/-]+$/.test(line.trim()) ||
      (line.trim().length < 60 && !/[\.:\?]$/.test(line.trim()))
    ) {
      if (currentName) {
        rows.push([currentName, currentDesc.join(' ').replace(/\s+/g, ' ').trim()]);
      }
      currentName = line.trim();
      currentDesc = [];
    } else if (currentName) {
      currentDesc.push(line.trim());
    }
  }
  if (currentName) {
    rows.push([currentName, currentDesc.join(' ').replace(/\s+/g, ' ').trim()]);
  }
  if (rows.length === 0) return null;
  // Markdown table
  const md = [
    '| Common Side Effect | Full Text Description |',
    '|--------------------|----------------------|',
    ...rows.map(([name, desc]) => `| ${name} | ${desc} |`)
  ];
  return md.join('\n');
}

processAllPDFs().catch(err => {
  console.error('Fatal error:', err);
});
