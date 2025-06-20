import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

export default function inlineSvgIntegration() {
  return {
    name: 'inline-svg-integration',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        console.log('Processing HTML files for SVG inlining and logo replacement...');
        
        const distPath = fileURLToPath(dir);
        const iconsPath = path.join(process.cwd(), 'public', 'icons');
        const ncisLogoUrl = 'https://www.ncis.com.sg/images/ncislibraries/default-album/ncis.png?sfvrsn=cf190fa6_1';
        
        // Find all HTML files in dist
        async function findHtmlFiles(dir) {
          const files = [];
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              files.push(...await findHtmlFiles(fullPath));
            } else if (entry.name.endsWith('.html')) {
              files.push(fullPath);
            }
          }
          
          return files;
        }
        
        const htmlFiles = await findHtmlFiles(distPath);
        
        // Process each HTML file
        for (const htmlFile of htmlFiles) {
          let content = await fs.readFile(htmlFile, 'utf-8');
          let modified = false;
          
          // Find all img tags with src="/icons/*.svg"
          const imgRegex = /<img([^>]*?)src="\/icons\/([^"]+)\.svg"([^>]*?)>/g;
          
          // Process all matches
          const matches = [...content.matchAll(imgRegex)];
          for (const match of matches) {
            const [fullMatch, beforeSrc, iconName, afterSrc] = match;
            try {
              const svgPath = path.join(iconsPath, `${iconName}.svg`);
              let svgContent = await fs.readFile(svgPath, 'utf-8');
              
              // Extract attributes from img tag
              const allAttrs = beforeSrc + afterSrc;
              const classMatch = allAttrs.match(/class="([^"]*)"/);
              const altMatch = allAttrs.match(/alt="([^"]*)"/);
              const widthMatch = allAttrs.match(/width="([^"]*)"/);
              const heightMatch = allAttrs.match(/height="([^"]*)"/);
              
              // Add attributes to SVG
              if (classMatch || altMatch || widthMatch || heightMatch) {
                svgContent = svgContent.replace('<svg', (svgTag) => {
                  let newTag = svgTag;
                  if (classMatch) newTag += ` class="${classMatch[1]}"`;
                  if (altMatch) newTag += ` aria-label="${altMatch[1]}"`;
                  if (widthMatch) newTag += ` width="${widthMatch[1]}"`;
                  if (heightMatch) newTag += ` height="${heightMatch[1]}"`;
                  return newTag;
                });
              }
              
              content = content.replace(fullMatch, svgContent);
              modified = true;
            } catch (error) {
              console.error(`Failed to inline SVG: ${iconName}`, error);
            }
          }
          
          // Replace NCIS logo path
          const ncisLogoRegex = /<img([^>]*?)src="\/ncis-logo\.png"([^>]*?)>/g;
          const ncisMatches = content.match(ncisLogoRegex);
          if (ncisMatches) {
            content = content.replace(ncisLogoRegex, (match, beforeSrc, afterSrc) => {
              return `<img${beforeSrc}src="${ncisLogoUrl}"${afterSrc}>`;
            });
            modified = true;
          }
          
          if (modified) {
            await fs.writeFile(htmlFile, content, 'utf-8');
            const modifications = [];
            if (matches.length > 0) modifications.push(`${matches.length} SVGs inlined`);
            if (ncisMatches) modifications.push('NCIS logo replaced');
            console.log(`✓ Processed ${path.relative(distPath, htmlFile)}: ${modifications.join(', ')}`);
          }
        }
        
        console.log('HTML processing complete!');
      }
    }
  };
}