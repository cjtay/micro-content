import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Updates frontmatter of MDX files using corrections.md from the same directory
 * 
 * Usage: node frontmatter-corrections.js
 * 
 * - Reads corrections.md from /src/utils/
 * - Processes original files from /src/content/pil/
 * - Saves corrected files to /src/content/pil-update/
 * 
 * The corrections.md file should contain frontmatter like:
 * ---
 * PIL-0001:
 *   title: "Corrected title"
 *   commonSideEffects:
 *     - name: "Updated side effect"
 * PIL-0002:
 *   description: "Updated description"
 * ---
 */

class FrontmatterUpdater {
  constructor() {
    this.args = process.argv.slice(2);
  }

  run() {
    // Fixed paths based on project structure
    const scriptDir = __dirname;
    const sourceDir = path.join(scriptDir, '../content/pil');
    const outputDir = path.join(scriptDir, '../content/pil-update');
    const correctionsDir = path.join(scriptDir, 'corrections');
    
    // Check if source directory exists
    if (!fs.existsSync(sourceDir)) {
      console.error(`Error: Source directory "${sourceDir}" does not exist`);
      return;
    }

    // Check if corrections directory exists
    if (!fs.existsSync(correctionsDir)) {
      console.error(`Error: corrections directory not found in "${scriptDir}"`);
      console.log('\nCreate individual correction files like:');
      console.log('corrections/PIL-0001.yaml:');
      console.log('title: "Corrected title"');
      console.log('commonSideEffects:');
      console.log('  [');
      console.log('    { name: "Updated side effect" }');
      console.log('  ]');
      return;
    }

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Created output directory: ${outputDir}`);
    }

    this.processIndividualCorrections(sourceDir, outputDir, correctionsDir);
  }

  processCorrections(sourceDir, outputDir, correctionsPath) {
    try {
      // Read and parse corrections file
      const correctionsContent = fs.readFileSync(correctionsPath, 'utf8');
      const correctionsParsed = matter(correctionsContent);
      const corrections = correctionsParsed.data;

      if (!corrections || Object.keys(corrections).length === 0) {
        console.log('No corrections found in corrections.md');
        return;
      }

      console.log(`Found corrections for ${Object.keys(corrections).length} file(s)`);
      console.log(`Source: ${sourceDir}`);
      console.log(`Output: ${outputDir}\n`);

      // Process each file that has corrections
      Object.keys(corrections).forEach(filename => {
        const fullFilename = filename.endsWith('.mdx') ? filename : `${filename}.mdx`;
        const sourceFilePath = path.join(sourceDir, fullFilename);
        const outputFilePath = path.join(outputDir, fullFilename);
        
        if (fs.existsSync(sourceFilePath)) {
          console.log(`Processing: ${fullFilename}`);
          this.updateFile(sourceFilePath, outputFilePath, corrections[filename]);
        } else {
          console.log(`⚠️  Skipping: ${fullFilename} (source file not found)`);
        }
      });

    } catch (error) {
      console.error('Error processing corrections:', error.message);
    }
  }

  processIndividualCorrections(sourceDir, outputDir, correctionsDir) {
    try {
      // Get all YAML files in corrections directory
      const correctionFiles = fs.readdirSync(correctionsDir)
        .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));

      if (correctionFiles.length === 0) {
        console.log('No correction files found in corrections directory');
        return;
      }

      console.log(`Found ${correctionFiles.length} correction file(s)`);
      console.log(`Source: ${sourceDir}`);
      console.log(`Output: ${outputDir}\n`);

      // Process each correction file
      correctionFiles.forEach(correctionFile => {
        const filename = path.basename(correctionFile, path.extname(correctionFile));
        const correctionPath = path.join(correctionsDir, correctionFile);
        const sourceFilePath = path.join(sourceDir, `${filename}.mdx`);
        const outputFilePath = path.join(outputDir, `${filename}.mdx`);

        if (fs.existsSync(sourceFilePath)) {
          console.log(`Processing: ${filename}.mdx`);
          
          // Read and parse individual correction file
          const correctionsContent = fs.readFileSync(correctionPath, 'utf8');
          const correctionsParsed = matter(correctionsContent);
          const corrections = correctionsParsed.data;
          
          this.updateFile(sourceFilePath, outputFilePath, corrections);
        } else {
          console.log(`⚠️  Skipping: ${filename}.mdx (source file not found)`);
        }
      });

    } catch (error) {
      console.error('Error processing individual corrections:', error.message);
    }
  }

  updateFile(sourceFilePath, outputFilePath, fileCorrections) {
    try {
      // Read original file from source
      const originalContent = fs.readFileSync(sourceFilePath, 'utf8');
      const originalParsed = matter(originalContent);

      // Deep merge corrections into original frontmatter
      const updatedData = this.deepMerge(originalParsed.data, fileCorrections);

      // Create updated file with custom formatting to preserve JSON-like arrays
      const yamlContent = this.formatYamlWithJsonArrays(updatedData);
      const updatedFile = `---\n${yamlContent}---\n\n${originalParsed.content}`;

      // Write updated file to output directory
      fs.writeFileSync(outputFilePath, updatedFile);
      
      console.log(`  ✓ Updated: ${path.basename(sourceFilePath)} → ${path.basename(outputFilePath)}`);
      
      // Show what changed
      this.showChanges(fileCorrections);
      console.log('');
      
    } catch (error) {
      console.error(`  ✗ Error processing ${path.basename(sourceFilePath)}:`, error.message);
    }
  }

  deepMerge(target, source) {
    const result = { ...target }; // ✅ KEEPS all original fields first

    Object.keys(source).forEach(key => {
      if (source[key] === null || source[key] === undefined) {
        result[key] = source[key];
      } else if (Array.isArray(source[key])) {
        // ✅ For arrays, replace entirely with corrected version
        result[key] = [...source[key]];
      } else if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
        // ✅ For objects, recursively merge (preserves nested fields not in corrections)
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        // ✅ For primitives, replace with corrected value
        result[key] = source[key];
      }
    });

    return result; // ✅ Returns: original fields + only corrected fields
  }

  showChanges(corrections, prefix = '') {
    console.log('    Applied corrections:');
    this.displayChanges(corrections, '      ');
  }

  displayChanges(obj, indent) {
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        console.log(`${indent}${key}:`);
        this.displayChanges(obj[key], indent + '  ');
      } else if (Array.isArray(obj[key])) {
        console.log(`${indent}${key}: [array with ${obj[key].length} items]`);
      } else {
        const value = typeof obj[key] === 'string' && obj[key].length > 50 
          ? obj[key].substring(0, 47) + '...' 
          : obj[key];
        console.log(`${indent}${key}: ${JSON.stringify(value)}`);
      }
    });
  }

  formatYamlWithJsonArrays(data, indent = '') {
    let yaml = '';
    
    Object.keys(data).forEach(key => {
      const value = data[key];
      
      if (value === null || value === undefined) {
        yaml += `${indent}${key}: null\n`;
      } else if (typeof value === 'boolean') {
        yaml += `${indent}${key}: ${value}\n`;
      } else if (typeof value === 'number') {
        yaml += `${indent}${key}: ${value}\n`;
      } else if (typeof value === 'string') {
        // Handle multi-line strings
        if (value.includes('\n')) {
          yaml += `${indent}${key}: >\n`;
          value.split('\n').forEach(line => {
            yaml += `${indent}  ${line}\n`;
          });
        } else {
          // Always quote string values
          yaml += `${indent}${key}: "${value.replace(/"/g, '\\"')}"\n`;
        }
      } else if (value instanceof Date) {
        yaml += `${indent}${key}: ${value.toISOString()}\n`;
      } else if (Array.isArray(value)) {
        // Check if it's a simple array of strings/numbers (like tags)
        const isSimpleArray = value.every(item => 
          typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
        );
        
        if (isSimpleArray && value.length > 0) {
          // Format simple arrays inline
          yaml += `${indent}${key}: [${value.map(item => JSON.stringify(item)).join(', ')}]\n`;
        } else {
          // Format complex arrays as JSON-like syntax
          yaml += `${indent}${key}:\n${indent}  [\n`;
          value.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
              yaml += `${indent}    {\n`;
              Object.keys(item).forEach((itemKey, itemIndex, allKeys) => {
                const itemValue = item[itemKey];
                const isLast = itemIndex === allKeys.length - 1;
                if (typeof itemValue === 'string') {
                  yaml += `${indent}      "${itemKey}": "${itemValue.replace(/"/g, '\\"')}"${isLast ? '' : ','}\n`;
                } else {
                  yaml += `${indent}      "${itemKey}": ${JSON.stringify(itemValue)}${isLast ? '' : ','}\n`;
                }
              });
              yaml += `${indent}    }${index < value.length - 1 ? ',' : ''}\n`;
            } else {
              yaml += `${indent}    ${JSON.stringify(item)}${index < value.length - 1 ? ',' : ''}\n`;
            }
          });
          yaml += `${indent}  ]\n`;
        }
      } else if (typeof value === 'object') {
        yaml += `${indent}${key}:\n`;
        yaml += this.formatYamlWithJsonArrays(value, indent + '  ');
      }
    });
    
    return yaml;
  }
}

// Show usage if no args
if (process.argv.length === 2) {
  console.log(`
Frontmatter Updater
===================

Updates MDX files using individual correction files from corrections/ directory.

Usage:
  node frontmatter-corrections.js

Paths (fixed):
• Corrections directory: /src/utils/corrections/
• Source files: /src/content/pil/*.mdx
• Output files: /src/content/pil-update/*.mdx

Individual correction files (e.g., corrections/PIL-0001.yaml):

title: "Corrected title for PIL-0001"
commonSideEffects:
  [
    {
      name: "Updated side effect name",
      description: "Updated description"
    }
  ]

Features:
• Individual files per PIL (easier management)
• Only include fields that need correction
• Supports nested objects and arrays  
• Shows applied changes
• Processes all files in corrections/ directory
• Saves corrected files to separate output directory
  `);
}

// Run the updater
const updater = new FrontmatterUpdater();
updater.run();