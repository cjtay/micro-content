# Micro-Content: Medical PIL Management System

## ⚠️ IMPORTANT: Documentation Currency Notice

**ALWAYS check the latest official documentation before making recommendations:**
- **Astro.js**: https://docs.astro.build/ (Currently using v5.7.10)
- **Tailwind CSS**: https://tailwindcss.com/docs (Currently using v4.1.0 with Vite plugin)
- **MDX**: https://mdxjs.com/ (Currently using v4.2.6)

The web development ecosystem evolves rapidly. Configuration patterns, best practices, and APIs change frequently. This documentation reflects the project state as of June 2025.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev                 # Runs on http://localhost:4321

# Process PDFs into content
npm run extract-pdfs        # Converts PDFs to MDX files

# Build for production
npm run build              # Outputs to ./dist/

# Preview production build
npm run preview
```

## Overview

The Micro-Content project is an Astro-based web application designed for Singapore's National University Hospital (NUH) and National Cancer Institute Singapore (NCIS) to manage and display Patient Information Leaflets (PILs) for cancer treatments. The system automates the conversion of PDF treatment protocols into interactive, web-based patient education materials.

### Core Purpose
Transform static PDF treatment protocols into dynamic, interactive web content that patients can easily understand and reference during their treatment journey.

### System Architecture
```
PDF Documents → Automated Extraction → Structured Content → Interactive Web Interface
```

## Table of Contents

- [Technical Stack](#technical-stack)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Content Management](#content-management)
- [PDF Processing Pipeline](#pdf-processing-pipeline)
- [Components](#components)
- [Development Workflow](#development-workflow)
- [AI/Claude Guidelines](#aiclause-guidelines)
- [Performance Optimization](#performance-optimization)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Technical Stack

### Framework & Build Tools
- **Astro 5.7.10**: Static site generator with component islands architecture
- **Vite**: Build tool integrated into Astro for fast development
- **MDX 4.2.6**: Markdown with JSX support for rich content
- **Tailwind CSS 4.1.0**: Now using `@tailwindcss/vite` plugin (no separate config file)
- **TypeScript**: For type safety and better developer experience

### PDF Processing
- **AsposePDF**: Enterprise-grade PDF text extraction
- **pdf-parse**: Lightweight PDF parsing fallback
- **csv-parse**: Structured data processing for tables
- **fs-extra**: Enhanced file system operations

### Configuration Notes
- **Tailwind CSS v4**: Configuration is now handled through Vite plugin in `astro.config.mjs`
- **No tailwind.config.js**: All Tailwind configuration is managed through the Vite plugin
- **Content Collections**: Using Astro's new loader-based content collections

## Project Structure

```
micro-content/
├── public/                    # Static assets
│   ├── fonts/                 # Open Sans font families
│   ├── icons/                 # Treatment icons (57 unique combinations)
│   │   ├── drip-*.svg        # IV treatments (18 colors)
│   │   ├── pill-*.svg        # Oral medications (15 colors)
│   │   ├── inject-*.svg      # Injections (4 colors)
│   │   └── radiation-*.svg   # Radiation therapy (2 colors)
│   └── *.png, *.svg          # Hospital logos and assets
├── src/
│   ├── assets/               # Build-time assets
│   ├── components/           # Reusable Astro components
│   ├── content/              # MDX content files
│   │   ├── pil/             # Patient Information Leaflets (107 files)
│   │   └── basic/           # Basic content pages
│   ├── data/                # JSON data files
│   │   └── treatments.json  # 57 treatments with icons
│   ├── layouts/             # Page layout templates
│   ├── pages/               # Route-based pages
│   │   ├── pil/            # PIL routes
│   │   ├── basic/          # Basic content routes
│   │   └── [others]        # Institution-specific pages
│   ├── styles/              # Global CSS files
│   └── utils/               # Utility functions
│       ├── extract/         # PDF processing pipeline
│       ├── corrections/     # Frontmatter correction files
│       └── frontmatter-corrections.js # Frontmatter updater script
├── astro.config.mjs         # Astro & Vite configuration
├── content.config.ts        # Content collection schemas
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── CLAUDE.md               # This documentation
```

## Key Features

### 1. **Automated PDF Processing**
- Extracts text and tabular data from medical PDFs
- Identifies 57 different treatments automatically
- Converts complex protocols into structured MDX files
- Handles multi-page documents and complex layouts

### 2. **Interactive Treatment Visualization**
- Visual treatment calendars with day-by-day schedules
- Color-coded icons with 12 distinct colors for clear differentiation
- Responsive grid layouts (mobile-first design)
- Treatment legends with visual icons

### 3. **Multi-Hospital Support**
- NUH (National University Hospital)
- NCIS (National Cancer Institute Singapore)
- HEH (Health Enrichment Hub)
- Institution-specific branding and layouts

### 4. **Content Management**
- Two content collections: `pils` and `basic`
- Type-safe content with Zod schemas
- Version control friendly MDX format
- Automated frontmatter generation

## Content Management

### Content Collections

#### PIL Collection Schema
```typescript
{
  title: string;
  description: string;
  slug: string;
  tags: string[];
  category: string;
  pubDate: Date;
  draft: boolean;
  days: number;                    // Treatment cycle length
  treatments: Array<{              // Treatment details
    name: string;
    cycle?: string;
    info?: string;
    icon?: string;
  }>;
  treatmentSchedule: Array<{       // Day-by-day schedule
    day: number;
    treatments: string[];
  }>;
  // Side effects arrays (optional)
  commonSideEffects?: Array<{...}>;
  occasionalSideEffects?: Array<{...}>;
  rareSideEffects?: Array<{...}>;
}
```

#### Basic Collection Schema
```typescript
{
  title: string;
  description?: string;
  slug: string;
  tags?: string[];
  category?: string;
  pubDate: Date;
  draft?: boolean;
}
```

### Treatment Data (treatments.json)

Currently contains 57 treatments with unique color-coded icons:

**Color Palette:**
- Original: blue, red, green, purple, orange, yellow
- Extended: pink, teal, coral, indigo, brown, olive, navy, maroon, gold, silver, lime, magenta

**Icon Types:**
- `pill-[color]`: Oral medications
- `drip-[color]`: IV infusions
- `inject-[color]`: Injections
- `radiation-[color]`: Radiation therapy
- `home`: Rest days
- `drug`: Generic treatment

## PDF Processing Pipeline

### Extraction Workflow

1. **PDF Upload** (`src/utils/pdfs/`)
   - Naming convention: `PIL-XXXXX - [treatment name].pdf`
   - Supports multi-page documents

2. **Text Extraction** (`pdf-text-extractor.js`)
   ```javascript
   - AsposePDF for complex layouts
   - Fallback to pdf-parse for simple PDFs
   - Preserves document structure
   ```

3. **Table Processing** (`pdf-table-extractor.js`)
   ```javascript
   - Extracts treatment schedules from tables
   - Exports to CSV for parsing
   - Handles spanning cells
   ```

4. **Treatment Matching** (`treatment-matcher.js`)
   ```javascript
   - Fuzzy matching against treatments.json
   - Case-insensitive comparison
   - Validates against known treatments
   ```

5. **Schedule Parsing** (`extractTreatmentSchedule.js`)
   ```javascript
   - Parses day ranges: "days 1-14", "day 1 to 14"
   - Handles rest periods and exceptions
   - Supports complex patterns: "days 1, 8 and 15"
   ```

6. **Content Generation** (`markdown-builder.js`)
   ```javascript
   - Generates MDX with frontmatter
   - Formats sections (details, side effects)
   - Creates treatment schedule YAML
   ```

7. **Frontmatter Corrections** (`frontmatter-corrections.js`)
   ```javascript
   - Updates MDX frontmatter using individual correction files
   - See FRONTMATTER.md for complete documentation
   ```

### Running the Extraction

```bash
# Place PDFs in src/utils/pdfs/
# Run extraction
npm run extract-pdfs

# Generated files appear in src/content/pil/
```

### Correcting Frontmatter

```bash
# See FRONTMATTER.md for complete documentation
cd src/utils && node frontmatter-corrections.js
```

## Components

### Core Components

#### Treatment Display
- **TreatmentGrid.astro**: Responsive calendar grid
- **TreatmentCard.astro**: Individual day cards with icons
- **IconsLegend.astro**: Visual treatment legend
- **LegendCard.astro**: Individual legend entries

#### Layout Components
- **Header.astro**: Default NUHS header
- **Header-nuh.astro**: NUH-specific branding
- **Header-ncis.astro**: NCIS cancer center branding
- **Footer.astro**: Contact and institutional info

#### Content Components
- **Accordion.astro**: Collapsible sections
- **CommonSideEffects.astro**: Side effects display
- **SafeHandlingAccordion.astro**: Safety information
- **HealthcareTeamContact.astro**: Contact details

### Layout System

1. **Layout.astro**: Base layout with NUH branding
2. **PilLayout.astro**: PIL-specific with treatment grids
3. **IndexLayout.astro**: Landing page layouts

## Development Workflow

### Adding New Treatments

1. **Update treatments.json**
   ```json
   {
     "name": "new-drug-name",
     "icon": "pill-[color]"  // Choose unique color
   }
   ```

2. **Generate Icon if Needed**
   - Copy existing SVG from same type
   - Update fill color in SVG
   - Save as `[type]-[color].svg`

3. **Process PDFs**
   ```bash
   # Add PDF to src/utils/pdfs/
   npm run extract-pdfs
   ```

### Creating Basic Content

1. **Create MDX file** in `src/content/basic/`
2. **Add frontmatter**:
   ```yaml
   ---
   title: "Page Title"
   description: "Brief description"
   slug: "url-slug"
   tags: ["tag1", "tag2"]
   category: "general"
   pubDate: 2025-06-21
   draft: false
   ---
   ```
3. **Write content** using Markdown/MDX

### Correcting Frontmatter

Use the frontmatter corrections system to fix extracted content without regenerating files from PDFs.

**See [FRONTMATTER.md](./FRONTMATTER.md) for complete documentation including:**
- Usage guide and examples
- Correction file format
- Troubleshooting
- Workflow integration

**Quick start:**
```bash
# Create correction files in src/utils/corrections/
# Run corrections
cd src/utils && node frontmatter-corrections.js
# Review output in src/content/pil-update/
```

### Modifying Components

1. **Check existing patterns** in similar components
2. **Use Tailwind classes** (v4 syntax)
3. **Test responsive behavior**
4. **Verify accessibility**

## AI/Claude Guidelines

### When Working with This Codebase

1. **Always Verify Current Versions**
   - Check package.json for exact versions
   - Consult official docs for latest syntax
   - Tailwind v4 uses different configuration than v3

2. **Content Generation**
   - Use existing MDX files as templates
   - Maintain consistent frontmatter structure
   - Follow established naming conventions

3. **PDF Processing**
   - Test extraction with sample PDFs first
   - Verify treatment names match treatments.json
   - Check generated schedules for accuracy

4. **Component Modifications**
   - Preserve existing class patterns
   - Maintain responsive breakpoints
   - Keep accessibility attributes

5. **Performance Considerations**
   - Avoid adding unnecessary dependencies
   - Use Astro's built-in optimizations
   - Keep JavaScript minimal

### Common Pitfalls to Avoid

1. **Don't assume Tailwind v3 syntax** - This project uses v4
2. **Don't create tailwind.config.js** - Configuration is in astro.config.mjs
3. **Don't modify build settings** without understanding implications
4. **Don't change content schemas** without updating all content files

## Performance Optimization

### Current Optimizations

1. **Build Configuration**
   ```javascript
   // astro.config.mjs
   compressHTML: false,         // For development clarity
   build: {
     format: "file",           // Flat HTML files
     inlineStylesheets: "always" // Self-contained pages
   }
   ```

2. **CSS Optimization**
   - Tailwind v4 automatically purges unused styles
   - Styles are inlined for faster loading
   - Minimal external dependencies

3. **Asset Optimization**
   - SVG icons are optimized and reusable
   - Fonts use display: swap for performance
   - Images in WebP format where possible

### Reducing Build Size

1. **Tailwind CSS Purging**
   - Happens automatically with @tailwindcss/vite
   - Ensure all dynamic classes are discoverable
   - Avoid string concatenation for classes

2. **Component Optimization**
   - Remove unused components
   - Lazy load heavy components
   - Use Astro's partial hydration

3. **Content Optimization**
   - Compress images before adding
   - Minimize MDX frontmatter
   - Remove draft content before production

## Deployment

### Build Process

```bash
# Production build
npm run build

# Files generated in ./dist/
# Each route becomes a standalone HTML file
# CSS is inlined into each page
```

### Deployment Checklist

- [ ] All PDFs processed successfully
- [ ] No draft content in production
- [ ] All treatment icons present
- [ ] Fonts loading correctly
- [ ] Mobile responsive tested
- [ ] Accessibility validated
- [ ] Performance metrics acceptable

### Production Configuration

- Static site suitable for any web server
- No server-side rendering required
- CDN-friendly asset structure
- Self-contained HTML pages

## Troubleshooting

### Common Issues

#### PDF Extraction Failures
- **Cause**: Corrupted or image-based PDFs
- **Solution**: Ensure PDFs have extractable text
- **Fallback**: Manual content creation

#### Treatment Not Found
- **Cause**: Treatment name not in treatments.json
- **Solution**: Add treatment with unique icon color
- **Validation**: Check spelling variations

#### Build Errors
- **Cause**: Invalid MDX frontmatter
- **Solution**: Validate against content schema
- **Tool**: Use TypeScript for type checking

#### Missing Icons
- **Cause**: Icon file not created for color
- **Solution**: Generate SVG with correct color
- **Naming**: Follow [type]-[color].svg pattern

#### Frontmatter Correction Issues
- **Cause**: Corrections directory or files not found
- **Solution**: See [FRONTMATTER.md](./FRONTMATTER.md) for complete troubleshooting guide

### Getting Help

1. Check this documentation first
2. Review error messages carefully
3. Consult official framework docs
4. Check component examples in codebase

---

## Version History

- **June 2025**: Major update with 57 treatments, Tailwind v4, Astro v5.7
- **Initial**: Basic PIL system with manual content

---

*This documentation is maintained alongside the codebase. For implementation details, refer to inline code comments and official framework documentation.*