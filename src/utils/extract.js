import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Create a require function for CommonJS modules
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
// const AsposePdf = require('asposepdfnodejs'); // Removed as it wasn't used in the logic provided

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//
// Configuration
//
const PDF_FOLDER = './src/utils/pdfs';
const CONTENT_FOLDER = './src/content/pil'; // Updated to match your collection path
const ASSETS_FOLDER = './src/assets';
const IMAGE_FOLDER = path.join(ASSETS_FOLDER, 'images');

// Specific headers (defined globally for access in multiple functions if needed)
const sectionHeaders = [
    "About the treatment",
    "Treatment details",
    "Side effects", // Consider case sensitivity: "Side Effects"?
    "Common Side Effects",
    "Other Common Side Effects",
    "Occasional Side Effects",
    "Rare Side Effects"
];
const specialHeader = "How to contact your Healthcare Team";


// Ensure all required directories exist
fs.ensureDirSync(PDF_FOLDER);
fs.ensureDirSync(CONTENT_FOLDER);
fs.ensureDirSync(ASSETS_FOLDER);
fs.ensureDirSync(IMAGE_FOLDER);

async function processAllPDFs() {
    console.log('Starting PDF extraction process...');
    // Get all PDF files in the pdfs folder
    const files = fs.readdirSync(PDF_FOLDER)
        .filter(file => file.toLowerCase().endsWith('.pdf'));
    console.log(`Found ${files.length} PDF files to process.`);

    // Process each file
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Processing file ${i + 1}/${files.length}: ${file}`);
        const fileNameWithoutExt = path.basename(file, '.pdf');

        try {
            await processPDF(file);
            console.log(`✓ Completed text extraction: ${file}`);
        } catch (error) {
            console.error(`✗ Error processing ${file}:`, error.message);
            console.error(error.stack); // Log stack trace for better debugging
        }
    }
    console.log('PDF extraction complete!');
}

async function processPDF(filename) {
    const filePath = path.join(PDF_FOLDER, filename);
    const fileNameWithoutExt = path.basename(filename, '.pdf');
    const outputPath = path.join(CONTENT_FOLDER, `${fileNameWithoutExt}.md`);

    // Read and parse the PDF to extract text
    const dataBuffer = fs.readFileSync(filePath);
    // Default pdf-parse extraction
    const data = await pdfParse(dataBuffer); // Use pdfParse's default text extraction

    console.log(`Processing PDF text: ${filename}`);
    console.log(`Total pages: ${data.numpages}`);

    // Check for LaTeX title format first
    const latexTitle = extractLatexTitle(data.text);

    // Clean text (basic cleaning before title extraction)
    const basicCleanedText = data.text
        .replace(/\r\n?/g, '\n') // Normalize line endings
        .replace(/\f/g, '\n\n') // Form feed to paragraph break
        .replace(/ +\n/g, '\n') // Remove trailing spaces before newlines
        .replace(/\n +/g, '\n') // Remove leading spaces after newlines
        .replace(/\n{3,}/g, '\n\n') // Collapse excessive blank lines
        .trim();

    // Prepare markdown frontmatter details
    const creationDate = new Date().toISOString();
    const slug = fileNameWithoutExt.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Extract title FROM the basic cleaned text, potentially joining lines, AND REMOVE IT
    const titleInfo = extractTitleAndRemove(basicCleanedText, fileNameWithoutExt, latexTitle);
    const title = titleInfo.title; // This is the potentially multi-line title joined string
    const bodyTextAfterTitleExtraction = titleInfo.processedText; // Text AFTER title lines removed
    console.log(`Detected title: "${title}"`);

    // Apply full cleaning and header formatting to the remaining body text
    // *** Use the UPDATED cleanBodyText function ***
    const finalBodyText = cleanBodyText(bodyTextAfterTitleExtraction);

    // Ensure title doesn't contain unescaped quotes for frontmatter
    const frontmatterTitle = title.replace(/"/g, '\\"');

    // Construct the final Markdown content
    const markdown = `---
title: "${frontmatterTitle}"
description: "Information extracted from ${filename}"
slug: "${slug}"
tags: ["pdf", "extracted", "${slug}"]
category: "patient information"
pubDate: ${creationDate}
draft: false
---

# ${title}

${finalBodyText}

> *Note: This document was automatically extracted from the PDF file "${filename}". Some formatting may differ from the original.*`;

    // Write the extracted text into a markdown file
    fs.writeFileSync(outputPath, markdown);
}


// Function to extract LaTeX title if present
function extractLatexTitle(text) {
    const titleMatch = text.match(/\\title\s*\{([\s\S]+?)\}/);
    if (titleMatch) {
        return titleMatch[1].replace(/\\?[&%#$_]/g, '$1') // Basic unescape common chars
                           .replace(/\\\\/g, '\n') // Allow line breaks within title
                           .replace(/\s+/g, ' ').trim();
    }
    return null;
}

// Function to check if a line looks like a list item
function isListItem(line) {
    const trimmedLine = line.trim();
    // Matches common bullets (*, -, •, ●) or LaTeX \item
    const isBullet = /^\s*([*•●\-])\s+/.test(line) || /^\s*\\item\s+/.test(line);
    // Matches numbered lists (1., 1), a., a), A., A))
    const isNumbered = /^\s*(\d+[.)]|[\(]?[a-zA-Z][.)]\)?)\s+/.test(trimmedLine);
    return isBullet || isNumbered;
}

// Function to convert list items to proper markdown format
function convertListItemToMarkdown(line) {
    const trimmedLine = line.trim();
    // Handle bullet points
    if (/^\s*([*•●\-])\s+/.test(line)) {
        // Use consistent '-' markdown bullet, preserving indentation
        const indentation = line.match(/^\s*/)[0];
        return `${indentation}- ${trimmedLine.substring(trimmedLine.indexOf(trimmedLine.match(/^\s*([*•●\-])\s+/)[1]) + 1).trim()}`;
    }
    // Handle LaTeX \item
    if (/^\s*\\item\s+/.test(line)) {
        const indentation = line.match(/^\s*/)[0];
        return `${indentation}- ${trimmedLine.substring(5).trim()}`; // Length of '\item '
    }
    // Handle numbered lists
    const numberedMatch = trimmedLine.match(/^(\d+[.)]|[\(]?[a-zA-Z][.)]\)?)\s+(.*)/);
    if (numberedMatch) {
        // Use standard "1." format, preserving indentation
        const marker = numberedMatch[1].replace(/[().]/g, ''); // Extract number/letter
        const content = numberedMatch[2];
        const indentation = line.match(/^\s*/)[0];
        // While markdown typically restarts numbering, using the original marker
        // might be less confusing if sub-lists aren't handled.
        // Let's use standard markdown format:
        return `${indentation}1. ${content}`; // Or keep original: `${indentation}${marker}. ${content}`;
    }
    return line; // Should not happen if called after isListItem check
}


// Function to check if a line looks like one of the predefined section headers
function isSectionHeader(line) {
    const trimmedLine = line.trim();
    // Exact match check
    if (trimmedLine === specialHeader || sectionHeaders.includes(trimmedLine)) {
        return true;
    }
     // Allow for minor variations like trailing colon or different case (case-insensitive check)
     const lowerTrimmed = trimmedLine.toLowerCase().replace(/:?\s*$/, ''); // Remove optional trailing colon and trim
     if (specialHeader.toLowerCase() === lowerTrimmed) {
         return true;
     }
     if (sectionHeaders.some(h => h.toLowerCase() === lowerTrimmed)) {
         return true;
     }
    return false;
}

// UPDATED: Function to extract title, potentially join lines, AND REMOVE IT from the text
function extractTitleAndRemove(text, filename, latexTitle = null) {
    let potentialTitle = '';
    let titleFound = false;
    let titleLines = []; // Store lines belonging to the title
    let titleStartIndex = -1;
    let linesToRemove = 0;

    const lines = text.split('\n');
    let processedLines = [...lines]; // Copy lines to modify

    // Priority 1: LaTeX title
    if (latexTitle) {
        potentialTitle = latexTitle; // Already processed for line breaks in extractLatexTitle if needed
        const latexTitlePattern = /\\title\s*\{/; // Find start of \title{...}
        titleStartIndex = processedLines.findIndex(line => latexTitlePattern.test(line.trim()));
        if (titleStartIndex !== -1) {
            // Assume \title might span multiple lines if braces aren't closed on the first line
            let currentLineIndex = titleStartIndex;
            let openBraces = (processedLines[currentLineIndex].match(/\{/g) || []).length;
            let closeBraces = (processedLines[currentLineIndex].match(/\}/g) || []).length;
            linesToRemove = 1;
            while (openBraces > closeBraces && currentLineIndex + 1 < processedLines.length) {
                currentLineIndex++;
                openBraces += (processedLines[currentLineIndex].match(/\{/g) || []).length;
                closeBraces += (processedLines[currentLineIndex].match(/\}/g) || []).length;
                linesToRemove++;
            }
            // Also remove \maketitle if it exists immediately after
            if (titleStartIndex + linesToRemove < processedLines.length && processedLines[titleStartIndex + linesToRemove].trim().startsWith('\\maketitle')) {
                linesToRemove++;
            }
        }
        titleFound = true;
    }

    // Priority 2: Look for the first H1 added by a potential previous cleaning step (less likely now)
    if (!titleFound) {
        for (let i = 0; i < Math.min(processedLines.length, 10); i++) { // Limit search depth
            const line = processedLines[i].trim();
            if (line.startsWith('# ')) {
                 potentialTitle = line.substring(2).trim();
                 titleStartIndex = i;
                 linesToRemove = 1; // Assume H1 is single line unless next line meets criteria
                 titleFound = true;
                 // Check next line for potential continuation (similar to heuristic below)
                 if (i + 1 < processedLines.length) {
                     const nextLine = processedLines[i + 1].trim();
                      // Continuation: Shorter, starts lowercase/connector, not list/header/#
                      if (nextLine && nextLine.length < potentialTitle.length &&
                          /^(and|or|with|for|\+|[a-z])/.test(nextLine) &&
                          !isListItem(nextLine) &&
                          !isSectionHeader(nextLine) &&
                          !nextLine.startsWith('#')) {
                         potentialTitle += ` ${nextLine}`;
                         linesToRemove++;
                     }
                 }
                break;
            }
        }
    }

    // Priority 3: Use the first non-empty line if suitable (heuristic) and check for continuation
    if (!titleFound) {
        for (let i = 0; i < Math.min(processedLines.length, 10); i++) { // Limit search depth
            const line = processedLines[i].trim();
            // Heuristic: Starts capital/number, not too long, not list/header/#, not specific non-title keywords
             if (line && line.length < 100 && /^[A-Z0-9\(]/.test(line) && !isListItem(line) && !isSectionHeader(line) && !line.startsWith('#') && !/^(Patient Information|Page \d+)/i.test(line)) {
                potentialTitle = line;
                titleStartIndex = i;
                linesToRemove = 1;
                titleFound = true; // Tentatively found the first line

                // ** Check subsequent lines for continuation **
                 let nextIndex = i + 1;
                 while (nextIndex < processedLines.length && linesToRemove < 4) { // Limit title lines check
                     const nextLine = processedLines[nextIndex].trim();
                     // Criteria for continuation:
                     // - Not empty
                     // - Relatively short (e.g., not significantly longer than first line)
                     // - Starts with lowercase, 'and', 'or', 'with', '+' etc. (or maybe just not uppercase?)
                     // - Not a list item
                     // - Not a predefined section header
                     // - Not another potential H1/H2/H3
                     if (nextLine && nextLine.length <= potentialTitle.length + 20 && // Allow slightly longer
                          (/^(and|or|with|for|under|\+|[a-z])/.test(nextLine) || potentialTitle.endsWith(',')) && // Common connectors or lowercase start, or if previous line ended with comma
                          !isListItem(nextLine) &&
                          !isSectionHeader(nextLine) &&
                          !nextLine.startsWith('#'))
                     {
                         potentialTitle += ` ${nextLine}`; // Join with space
                         linesToRemove++;
                         nextIndex++;
                     } else {
                         // Stop checking if continuation criteria fail
                         break;
                     }
                 }
                 // Break outer loop once first potential title block is found and checked
                 break;
            }
            // If line is empty or clearly not a title candidate, continue searching
            if (line && i > 5) break; // Stop searching early if no candidates found near top
        }
    }

    // Fallback: Use filename if absolutely no title candidate found
    if (!potentialTitle) {
        potentialTitle = filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        // No lines to remove if using filename fallback
        titleStartIndex = -1;
        linesToRemove = 0;
    }

    // Remove the identified title lines from the processed text if found
    if (titleStartIndex !== -1 && linesToRemove > 0) {
         processedLines.splice(titleStartIndex, linesToRemove);
         // Also remove potential blank line immediately following the title block
         if (titleStartIndex < processedLines.length && processedLines[titleStartIndex].trim() === '') {
             processedLines.splice(titleStartIndex, 1);
         }
    }

    // Final cleaning of the assembled title string
    potentialTitle = potentialTitle.replace(/\s+/g, ' ').trim();

    return { title: potentialTitle, processedText: processedLines.join('\n') }; // Return remaining lines joined
}


// ****** UPDATED cleanBodyText FUNCTION ******
function cleanBodyText(text) {
    const lines = text.split('\n');
    const processedBlocks = []; // Store blocks (headers, lists, paragraphs)
    let currentParagraph = []; // Accumulate lines for the current paragraph

    function flushParagraph() {
        if (currentParagraph.length > 0) {
            // Join lines with spaces, trim, and add as a single block
            // Also perform minor cleanups like space before punctuation
            let joined = currentParagraph.join(' ').trim();
            joined = joined.replace(/\s+([.,;:!?])/g, '$1'); // Remove space before punctuation
            processedBlocks.push(joined);
            currentParagraph = []; // Reset for the next paragraph
        }
    }

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let trimmedLine = line.trim();

        // --- Handle Blank Lines ---
        if (!trimmedLine) {
            // Blank line signifies a potential paragraph break
            flushParagraph();
            // Add a marker for potential blank line preservation.
            // We'll handle actual spacing in post-processing.
            if (processedBlocks.length > 0 && processedBlocks[processedBlocks.length - 1] !== '') {
                 processedBlocks.push(''); // Add only if previous wasn't also blank
            }
            continue;
        }

        // --- Check for Non-Paragraph Blocks ---

        // 1. Specific Headers (Case-insensitive check)
        let isSpecificHeader = false;
        const lowerTrimmed = trimmedLine.toLowerCase().replace(/:?\s*$/, '');
        const matchedHeader = sectionHeaders.find(h => h.toLowerCase() === lowerTrimmed);

        if (specialHeader.toLowerCase() === lowerTrimmed) {
            flushParagraph(); // Finish previous paragraph
            // Use the *original* casing from the line for the header
            processedBlocks.push(`## ${trimmedLine.replace(/:?\s*$/, '')}`);
            isSpecificHeader = true;
        } else if (matchedHeader) {
             flushParagraph(); // Finish previous paragraph
             // Use the *original* casing from the line
             processedBlocks.push(`### ${trimmedLine.replace(/:?\s*$/, '')}`);
             isSpecificHeader = true;
        }
        if (isSpecificHeader) continue;


        // 2. List Items
        if (isListItem(line)) {
            flushParagraph(); // Finish previous paragraph
            processedBlocks.push(convertListItemToMarkdown(line)); // Add list item as its own block
            // Note: Consecutive list items will be added as separate blocks here.
            // Post-processing will handle spacing between them.
            continue;
        }

        // 3. Existing Markdown Headers (likely from LaTeX conversion)
        if (trimmedLine.startsWith('#')) {
            flushParagraph(); // Finish previous paragraph
            processedBlocks.push(trimmedLine);
            continue;
        }

        // 4. Heuristic Header Detection (Simplified)
        // Consider if a line MIGHT be a header if it's title-cased, short, and stands alone.
        // This is less reliable than predefined headers. Use sparingly or refine criteria.
        const isLikelyStandalone =
             (processedBlocks.length === 0 || processedBlocks[processedBlocks.length - 1] === '') // Preceded by blank
             && (i === lines.length - 1 || lines[i+1].trim() === ''); // Followed by blank or end of text
        const isTitleCase = /^[A-Z][a-zA-Z\s]*$/.test(trimmedLine) && trimmedLine.length < 70 && !trimmedLine.includes('.');

        if (isTitleCase && isLikelyStandalone && !isListItem(line) && !isSectionHeader(line)) {
            // Avoid applying if it looks like a short sentence fragment.
            // Check if previous block ended with punctuation? Too complex for now.
            // Let's assume it's a header if it meets these conditions.
             flushParagraph();
             processedBlocks.push(`### ${trimmedLine}`); // Treat as H3
             continue; // Skip paragraph handling
        }

        // --- Default: Assume Paragraph Text ---
        // Add the line to the current paragraph accumulator
        currentParagraph.push(trimmedLine);
    }

    // Flush any remaining paragraph lines after the loop
    flushParagraph();

    // --- Post-processing: Join blocks with appropriate spacing ---
    let finalOutput = '';
    for (let i = 0; i < processedBlocks.length; i++) {
        const currentBlock = processedBlocks[i];
        const prevBlock = i > 0 ? processedBlocks[i - 1] : null;

        if (currentBlock === '') {
            // Handles the blank line markers added earlier
            // Ensure we don't add more than one consecutive blank line overall
             if (finalOutput.length > 0 && !finalOutput.endsWith('\n\n')) {
                 finalOutput += '\n';
             }
            continue;
        }

        // Add spacing *before* the current block if needed
        if (prevBlock !== null) {
            // Add double newline (blank line) before headers and paragraphs,
            // unless the previous block was also a header (maybe only single newline then?).
            // Add single newline before list items if previous was also a list item (tight list).
            // Add double newline before list items if previous was not (start of list).

            const currentIsList = isListItem(currentBlock); // Use original check logic on the *processed* block
            const prevIsList = prevBlock !== '' && isListItem(prevBlock);
            const currentIsHeader = currentBlock.startsWith('#');
            const prevIsHeader = prevBlock !== '' && prevBlock.startsWith('#');

            if (currentIsHeader) {
                finalOutput += '\n\n'; // Always space before headers
            } else if (currentIsList) {
                if (prevIsList) {
                    finalOutput += '\n'; // Tight list items
                } else {
                    finalOutput += '\n\n'; // Space before start of a list
                }
            } else { // Current block is a paragraph
                 finalOutput += '\n\n'; // Space before paragraphs
            }
        }

        finalOutput += currentBlock; // Add the block itself
    }

    // Final cleanup: Ensure max one blank line, trim start/end
    return finalOutput.replace(/\n{3,}/g, '\n\n').trim();
}
// ****** END OF UPDATED cleanBodyText FUNCTION ******


// This function remains mostly for LaTeX specific cleaning, called ONLY if LaTeX detected early.
// It might be simplified if the main cleanBodyText handles most cases well.
function cleanLatexText(text) {
    console.log("Cleaning LaTeX text (basic)...");

    let cleanedText = text
        .replace(/\r\n?/g, '\n') // Normalize line endings
        // Keep form feeds for now, might indicate page breaks handled later
        // .replace(/\f/g, '\n\n')
        .trim();

    const lines = cleanedText.split('\n');
    const processedLines = [];

     for (let i = 0; i < lines.length; i++) {
        let line = lines[i]; // Keep original line for context
        let trimmedLine = line.trim();

        // Skip common preamble/structure/formatting commands if they are on their own line
        if (/^\\(documentclass|usepackage|begin\{document\}|end\{document\}|maketitle|noindent|bigskip|smallskip|medskip|newpage|clearpage|label\{.*?\})/.test(trimmedLine)) continue;
        if (/^\\(hspace|vspace)\*?\{.*?\}/.test(trimmedLine)) continue;
        if (trimmedLine.startsWith('\\begin{itemize}') || trimmedLine.startsWith('\\begin{enumerate}') || trimmedLine.startsWith('\\end{itemize}') || trimmedLine.startsWith('\\end{enumerate}')) continue;
        if (trimmedLine === '\\') continue; // Skip lines with just a backslash

        // Keep \title line(s) for extraction later by extractTitleAndRemove
        if (trimmedLine.startsWith('\\title')) {
             processedLines.push(line); // Keep original line content
             // Consume subsequent lines if title definition spans them (basic check)
             let currentLineIndex = i;
             while (!lines[currentLineIndex].includes('}') && currentLineIndex + 1 < lines.length) {
                 currentLineIndex++;
                 processedLines.push(lines[currentLineIndex]);
                 i++; // Advance outer loop index
             }
             continue;
         }

        // Basic conversion of sectioning commands (will be reformatted by cleanBodyText later)
        line = line.replace(/\\section\*?\s*\{([\s\S]+?)\}/g, '# $1');
        line = line.replace(/\\subsection\*?\s*\{([\s\S]+?)\}/g, '## $1');
        line = line.replace(/\\subsubsection\*?\s*\{([\s\S]+?)\}/g, '### $1');

        // Keep \item lines for cleanBodyText to handle list conversion
        // Basic formatting conversion within lines
        line = line.replace(/\\textbf\{([\s\S]+?)\}/g, '**$1**');
        line = line.replace(/\\textit\{([\s\S]+?)\}/g, '*$1*');
        line = line.replace(/\\emph\{([\s\S]+?)\}/g, '*$1*');
        line = line.replace(/\\texttt\{([\s\S]+?)\}/g, '`$1`');
        line = line.replace(/\\url\{([\s\S]+?)\}/g, '<$1>'); // Basic URL handling

        // Unescape common characters
        line = line.replace(/\\%/g, '%');
        line = line.replace(/\\&/g, '&');
        line = line.replace(/\\#/g, '#');
        line = line.replace(/\\_/g, '_');
        line = line.replace(/\\\$/g, '$'); // Unescape dollar sign itself

        // Handle explicit newlines within paragraphs
        line = line.replace(/\\\\/g, '\n'); // Convert LaTeX newline to actual newline
        line = line.replace(/\\newline/g, '\n');

        // Remove common referencing commands
        line = line.replace(/\\(ref|pageref|cite)\{.*?\}/g, '');

        // Remove comments
        line = line.replace(/%.*$/, ''); // Remove from '%' to end of line

        // Add the processed line
        processedLines.push(line);

    }

    // Join lines back, cleanBodyText will handle final paragraph joining and spacing
    return processedLines.join('\n');
}


// Run the full process
processAllPDFs().catch(error => {
    console.error("An unhandled error occurred during PDF processing:", error);
});