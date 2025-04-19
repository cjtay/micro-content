import { SECTION_HEADERS } from "./config.js";

export async function formatSectionsWithSideEffects(text, tablesByPage) {
  const lines = text.split("\n");
  const outputLines = [];
  let currentSection = null;
  let sectionBuffer = [];

  const sectionMap = {
    "common side effects": "### Common Side Effects",
    "other common side effects": "### Other Common Side Effects",
    "occasional side effects": "### Occasional Side Effects",
    "rare side effects": "### Rare Side Effects",
  };

  function flushSection() {
    if (!currentSection) return;
    const heading = sectionMap[currentSection];
    if (heading) outputLines.push(heading);
    if (currentSection === "common side effects") {
      let tableMd = extractCommonSideEffectsTableFromPages(tablesByPage);
      if (!tableMd) {
        tableMd = extractCommonSideEffectsTableFromText(sectionBuffer);
      }
      if (tableMd) {
        outputLines.push("");
        outputLines.push(tableMd);
        outputLines.push("");
      }
    } else {
      const bullets = extractBulletList(sectionBuffer);
      if (bullets.length) {
        outputLines.push("");
        outputLines.push(...bullets.map((b) => `- ${b}`));
        outputLines.push("");
      }
    }
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
    if (
      SECTION_HEADERS.some((h) => h.toLowerCase() === lower) &&
      !sectionMap[lower]
    ) {
      flushSection();
      if (lower === "treatment details") {
        idx++;
        while (
          idx < lines.length &&
          !SECTION_HEADERS.some(
            (h) => h.toLowerCase() === lines[idx].trim().toLowerCase()
          )
        ) {
          idx++;
        }
        idx--;
        continue;
      }
      outputLines.push(`### ${line}`);
      continue;
    }

    if (currentSection) {
      sectionBuffer.push(line);
      continue;
    }
    outputLines.push(line);
  }
  flushSection();

  let output = outputLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return output;
}

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
  const header = table[0].map((cell) => cell.toLowerCase().trim());
  return (
    header.includes("common side effect") &&
    header.some((h) => h.includes("description"))
  );
}

function extractCommonSideEffectsTableFromText(lines) {
  const rows = [];
  let currentName = null;
  let currentDesc = [];
  for (let line of lines) {
    if (!line.trim()) continue;
    if (
      /^[A-Z][A-Za-z0-9 ()/-]+$/.test(line.trim()) ||
      (line.trim().length < 60 && !/[\.:\?]$/.test(line.trim()))
    ) {
      if (currentName) {
        rows.push([
          currentName,
          currentDesc.join(" ").replace(/\s+/g, " ").trim(),
        ]);
      }
      currentName = line.trim();
      currentDesc = [];
    } else if (currentName) {
      currentDesc.push(line.trim());
    }
  }
  if (currentName) {
    rows.push([currentName, currentDesc.join(" ").replace(/\s+/g, " ").trim()]);
  }
  if (rows.length === 0) return null;
  const md = [
    "| Common Side Effect | Full Text Description |",
    "|--------------------|----------------------|",
    ...rows.map(([name, desc]) => `| ${name} | ${desc} |`),
  ];
  return md.join("\n");
}

function csvTableToMarkdown(table) {
  const header = table[0];
  const md = [
    "| " + header.join(" | ") + " |",
    "| " + header.map(() => "---").join(" | ") + " |",
    ...table.slice(1).map((row) => "| " + row.join(" | ") + " |"),
  ];
  return md.join("\n");
}
