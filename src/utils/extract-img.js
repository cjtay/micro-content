import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Create a require function for CommonJS modules
const require = createRequire(import.meta.url);

const pdfParse = require('pdf-parse');
const AsposePdf = require('asposepdfnodejs');

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
    
    // Create subfolder for this document's images
    const documentImageFolder = path.join(IMAGE_FOLDER, fileNameWithoutExt);
    fs.ensureDirSync(documentImageFolder);
    
    // Process each file - extract images and then create markdown with text and image references
    let extractedImages = [];
    try {
      // First extract images
      extractedImages = await processPDFImages(file, documentImageFolder);
      console.log(`✓ Completed image extraction: ${file}`);
      
      // Then process text and include image references
      await processPDF(file, extractedImages);
      console.log(`✓ Completed text extraction: ${file}`);
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error.message);
    }
  }
  
  console.log('PDF extraction complete!');
}

async function processPDF(filename, extractedImages) {
  const filePath = path.join(PDF_FOLDER, filename);
  const fileNameWithoutExt = path.basename(filename, '.pdf');
  const outputPath = path.join(CONTENT_FOLDER, `${fileNameWithoutExt}.md`);
  
  // Read and parse the PDF to extract text
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer, {
    metaDataFn: function (metadata) {
      return metadata;
    }
  });
  
  console.log(`Processing PDF text: ${filename}`);
  console.log(`Total pages: ${data.numpages}`);
  console.log(`PDF info: ${JSON.stringify(data.info, null, 2)}`);
  
  // Check for LaTeX title format first
  const latexTitle = extractLatexTitle(data.text);
  
  // Clean and format extracted text
  const cleanedText = cleanExtractedText(data.text, data);
  
  // Prepare markdown frontmatter
  const creationDate = new Date().toISOString();
  const slug = fileNameWithoutExt.toLowerCase().replace(/\s+/g, '-');
  
  // Try to extract a title from the content, prioritizing LaTeX title if found
  const titleInfo = extractTitle(cleanedText, filename, latexTitle);
  const title = titleInfo.title;
  
  console.log(`Detected title: ${title}`);
  
  // Insert images at appropriate locations in the markdown
  const processedTextWithImages = insertImagesInMarkdown(
    titleInfo.processedText,
    extractedImages,
    fileNameWithoutExt
  );
  
  // Update frontmatter to match your collection schema
  const markdown = `---
title: "${title}"
description: "Extracted from ${filename}"
slug: "${slug}"
tags: ["pdf", "extracted"]
category: "documentation"
pubDate: ${creationDate}
---

${processedTextWithImages}

> Note: This document was automatically extracted from "${filename}". The original PDF had ${data.numpages} pages.`;
  
  // Write the extracted text into a markdown file
  fs.writeFileSync(outputPath, markdown);
}

async function processPDFImages(filename, documentImageFolder) {
  const filePath = path.join(PDF_FOLDER, filename);
  const fileNameWithoutExt = path.basename(filename, '.pdf');
  
  // Initialize AsposePdf module
  const asposePdfModule = await AsposePdf();
  
  // Create an output template for images inside the document-specific folder
  const imageOutputPattern = path.join(documentImageFolder, `${fileNameWithoutExt}_image{0:D2}.jpg`);
  
  console.log(`Processing PDF images: ${filename}`);
  
  // Extract images at 150 DPI
  const json = asposePdfModule.AsposePdfExtractImage(filePath, imageOutputPattern, 150);
  
  if (json.errorCode === 0) {
    // Rather than trying to parse the file names from json.filesNameResult,
    // just scan the output directory for the generated image files
    const extractedImages = [];
    
    if (fs.existsSync(documentImageFolder)) {
      const files = fs.readdirSync(documentImageFolder);
      
      // Filter for image files that match our naming pattern
      const imageFiles = files.filter(file => 
        file.startsWith(`${fileNameWithoutExt}_image`) &&
        (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.jpeg'))
      );
      
      console.log(`Found ${imageFiles.length} images in ${fileNameWithoutExt} folder`);
      
      // Sort files to ensure correct order (image01, image02, etc.)
      imageFiles.sort();
      
      imageFiles.forEach(file => {
        extractedImages.push({
          fullPath: path.join(documentImageFolder, file),
          fileName: file,
          // Update path to use the correct relative path for AstroJS
          relativePath: `/src/assets/images/${fileNameWithoutExt}/${file}`
        });
      });
    }
    
    return extractedImages;
  } else {
    throw new Error(json.errorText || "Error extracting images");
  }
}

// Function to extract LaTeX title if present
function extractLatexTitle(text) {
  const titleMatch = text.match(/\\title\s*\{([^}]+)\}/);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  return null;
}

// Function to check if a line is a list item (either bullet point or numbered list)
function isListItem(line) {
  // Check for bullet points: *, •, ●, -, etc.
  const isBullet = /^\s*[*•●\-]\s+/.test(line) || // Common bullet characters
                 /^\s*\\item\s+/.test(line);    // LaTeX item
  
  // Check for numbered lists: 1., 2., (1), (2), etc.
  const isNumbered = /^\s*\d+[\.\)]\s+/.test(line);
  
  return isBullet || isNumbered;
}

// Function to convert list items to proper markdown format
function convertListItemToMarkdown(line) {
  // Handle bullet points - convert to dash
  if (/^\s*[*•●]\s+/.test(line)) {
    return line.replace(/^\s*[*•●]\s+/, '- ');
  }
  
  // Handle LaTeX items
  if (/^\s*\\item\s+/.test(line)) {
    return line.replace(/^\s*\\item\s+/, '- ');
  }
  
  // Already has a dash, just ensure proper spacing
  if (/^\s*\-\s+/.test(line)) {
    return line.replace(/^\s*\-\s+/, '- ');
  }
  
  // For numbered lists, preserve the number but ensure proper spacing
  if (/^\s*(\d+)[\.\)]\s+/.test(line)) {
    return line.replace(/^\s*(\d+)([\.\)])\s+/, '$1$2 ');
  }
  
  // Return original if none of the above
  return line;
}

// Function to insert image references at appropriate locations in markdown
function insertImagesInMarkdown(markdownText, images, documentName) {
  if (!images || images.length === 0) {
    return markdownText; // No images to insert
  }
  
  // Split the markdown into lines for processing
  const lines = markdownText.split('\n');
  const resultLines = [];
  
  // Track which images we've inserted
  let imageIndex = 0;
  
  // Track headings to place images after important sections
  let headingCount = 0;
  
  // Process the markdown line by line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is a list item and convert it
    if (isListItem(line)) {
      resultLines.push(convertListItemToMarkdown(line));
    } else {
      resultLines.push(line);
    }
    
    // Identify major section breaks (headings, empty lines after paragraphs)
    if (line.startsWith('# ') || line.startsWith('## ')) {
      headingCount++;
      
      // Insert image after heading if we have one available and it's not the first heading
      if (imageIndex < images.length && headingCount > 1) {
        // Add a blank line before the image
        resultLines.push('');
        
        // Add the image with alt text based on the heading
        const headingText = line.replace(/^#+ /, '').trim();
        const altText = `${documentName} - ${headingText}`;
        resultLines.push(`![${altText}](${images[imageIndex].relativePath})`);
        
        // Add a blank line after the image
        resultLines.push('');
        imageIndex++;
      }
    }
    // Also look for list sections which might be good places for images
    else if (isListItem(line) && imageIndex < images.length) {
      // If we're at the end of a list section (next line is empty)
      if (i < lines.length - 1 && lines[i + 1].trim() === '') {
        // Add the image after the list
        resultLines.push('');
        const altText = `${documentName} - Illustration ${imageIndex + 1}`;
        resultLines.push(`![${altText}](${images[imageIndex].relativePath})`);
        resultLines.push('');
        imageIndex++;
      }
    }
  }
  
  // If we still have unused images, append them at the end before the conclusion
  while (imageIndex < images.length) {
    resultLines.push('');
    const altText = `${documentName} - Additional Image ${imageIndex + 1}`;
    resultLines.push(`![${altText}](${images[imageIndex].relativePath})`);
    resultLines.push('');
    imageIndex++;
  }
  
  return resultLines.join('\n');
}

function extractTitle(text, filename, latexTitle = null) {
  // If we have a LaTeX title, use it with priority
  if (latexTitle) {
    return { 
      title: latexTitle, 
      processedText: text 
    };
  }
  
  const lines = text.split('\n');
  let title = '';
  let processedLines = [...lines];
  
  // Find the first heading (line starting with "# ")
  const h1Match = text.match(/^#\s+(.+)$/m);
  
  if (h1Match) {
    const h1Line = h1Match[0];
    const h1Index = lines.findIndex(line => line === h1Line);
    
    if (h1Index >= 0) {
      let mainTitle = h1Match[1].trim();
      let subtitleIndex = -1;
      
      for (let i = h1Index + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        if (!line.startsWith('#') && line.length > 0 && line.length < 100 && !line.match(/[.,:;!?]$/)) {
          subtitleIndex = i;
          break;
        } else {
          break;
        }
      }
      
      if (subtitleIndex > 0) {
        const subtitle = lines[subtitleIndex].trim();
        title = `${mainTitle}: ${subtitle}`;
        processedLines.splice(subtitleIndex, 1);
      } else {
        title = mainTitle;
      }
    }
  } else {
    // If no heading was found, use the filename
    title = filename.replace(/\.pdf$/i, '').replace(/-/g, ' ');
  }
  
  return { title, processedText: processedLines.join('\n') };
}

function cleanExtractedText(text, pdfData) {
  // Check for LaTeX format and handle it specially
  if (text.includes('\\title') || text.includes('\\section')) {
    return cleanLatexText(text);
  }
  
  let cleanedText = text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\f/g, '\n\n')
    .replace(/([^\n])\n([a-z])/g, '$1 $2')
    .trim();
  
  const lines = cleanedText.split('\n');
  const firstLine = lines[0].trim();
  
  if (firstLine && firstLine.length > 5 && firstLine.length < 100 && !firstLine.match(/[.,:;!?]$/)) {
    lines[0] = `# ${firstLine}`;
  }
  
  const processedLines = [];
  let prevLineLength = 0;
  let lineCount = 0;
  let foundFirstHeading = lines[0].startsWith('# ');
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    if (!line) {
      processedLines.push('');
      continue;
    }
    
    // Check if this is a list item and handle it specially
    if (isListItem(line)) {
      processedLines.push(convertListItemToMarkdown(line));
      prevLineLength = line.length;
      lineCount++;
      continue;
    }
    
    if (line.startsWith('# ')) {
      processedLines.push(line);
      prevLineLength = line.length;
      lineCount++;
      continue;
    }
    
    const isShortLine = line.length < 65 && line.length > 3;
    const lacksEndPunctuation = !line.match(/[.,:;!?]$/);
    const isFollowedByEmpty = i < lines.length - 1 && !lines[i + 1].trim();
    const isPrecededByEmpty = i > 0 && !lines[i - 1].trim();
    const isDistinctLength =
      (prevLineLength > 0 && line.length < prevLineLength * 0.7) ||
      (i < lines.length - 1 && lines[i + 1].trim() && line.length < lines[i + 1].trim().length * 0.7);
    const isNearDocumentStart = lineCount < 10;
    const isVisualSeparator = line.match(/^[-=_]{3,}$/);
    
    const isMajorTitle =
      line.length > 15 &&
      line.length < 60 &&
      lacksEndPunctuation &&
      (isPrecededByEmpty || isNearDocumentStart) &&
      isFollowedByEmpty;
    
    if (!foundFirstHeading && isNearDocumentStart && isShortLine && lacksEndPunctuation) {
      processedLines.push(`# ${line}`);
      foundFirstHeading = true;
    } else if (isMajorTitle || (line.match(/^[A-Z]/) && isShortLine && lacksEndPunctuation && (isFollowedByEmpty || isPrecededByEmpty))) {
      processedLines.push(`# ${line}`);
    } else if (isShortLine && lacksEndPunctuation && (isFollowedByEmpty || isPrecededByEmpty) && line.length < 40) {
      processedLines.push(`## ${line}`);
    } else if (isShortLine && (isDistinctLength || isFollowedByEmpty) && lacksEndPunctuation) {
      processedLines.push(`### ${line}`);
    } else if (isVisualSeparator) {
      continue;
    } else {
      processedLines.push(line);
    }
    
    prevLineLength = line.length;
    lineCount++;
  }
  
  return processedLines.join('\n');
}

// Function to clean LaTeX formatted text
function cleanLatexText(text) {
  let cleanedText = text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\f/g, '\n\n')
    .trim();
  
  const lines = cleanedText.split('\n');
  const processedLines = [];
  
  // Process the text line by line
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      processedLines.push('');
      continue;
    }
    
    // Convert LaTeX title to markdown title
    if (line.startsWith('\\title')) {
      const titleMatch = line.match(/\\title\s*\{([^}]+)\}/);
      if (titleMatch) {
        processedLines.push(`# ${titleMatch[1].trim()}`);
      }
      continue;
    }
    
    // Convert LaTeX sections to markdown headers
    if (line.startsWith('\\section')) {
      const sectionMatch = line.match(/\\section\*?\{([^}]+)\}/);
      if (sectionMatch) {
        processedLines.push(`# ${sectionMatch[1].trim()}`);
      }
      continue;
    }
    
    // Convert LaTeX subsections to markdown headers
    if (line.startsWith('\\subsection')) {
      const subsectionMatch = line.match(/\\subsection\*?\{([^}]+)\}/);
      if (subsectionMatch) {
        processedLines.push(`## ${subsectionMatch[1].trim()}`);
      }
      continue;
    }
    
    // Check if this is a numbered list in LaTeX format
    const numberedListMatch = line.match(/^\\item\[(\d+)[\.\)]\]\s+(.+)/);
    if (numberedListMatch) {
      processedLines.push(`${numberedListMatch[1]}. ${numberedListMatch[2].trim()}`);
      continue;
    }
    
    // Convert LaTeX bullet points
    if (line.match(/^-\s+/) || line.startsWith('\\item')) {
      // Handle LaTeX items
      if (line.startsWith('\\item')) {
        line = line.replace(/^\\item\s+/, '- ');
      } 
      // Handle simple dash bullet points
      else if (line.match(/^-\s+/)) {
        line = line.replace(/^-\s+/, '- ');
      }
      processedLines.push(line);
      continue;
    }
    
    // Remove LaTeX formatting that we don't need
    if (line.match(/^\\(begin|end)\{/)) {
      continue;
    }
    
    // Skip certain LaTeX commands without content
    if (line.startsWith('\\') && !line.includes('{')) {
      continue;
    }
    
    // Otherwise, keep the line as is
    processedLines.push(line);
  }
  
  return processedLines.join('\n');
}

// Run the full process
processAllPDFs().catch(console.error);

// Export the function for potential import in other files
export default processAllPDFs;
