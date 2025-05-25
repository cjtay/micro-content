# Micro-Content: Medical PIL Management System

## Overview

The Micro-Content project is an Astro-based web application designed for Singapore's National University Hospital (NUH) and National Cancer Institute Singapore (NCIS) to manage and display Patient Information Leaflets (PILs) for cancer treatments. The system automates the conversion of PDF treatment protocols into interactive, web-based patient education materials.

## Table of Contents

- [Project Architecture](#project-architecture)
- [Key Features](#key-features)
- [Technical Stack](#technical-stack)
- [Project Structure](#project-structure)
- [Components](#components)
- [Content Management](#content-management)
- [PDF Processing Pipeline](#pdf-processing-pipeline)
- [Data Flow](#data-flow)
- [Development Workflow](#development-workflow)
- [Deployment](#deployment)

## Project Architecture

### Core Purpose
Transform static PDF treatment protocols into dynamic, interactive web content that patients can easily understand and reference during their treatment journey.

### System Overview
```
PDF Documents → Automated Extraction → Structured Content → Interactive Web Interface
```

## Key Features

### 1. **Automated PDF Processing**
- Extracts text and tabular data from medical PDFs
- Identifies treatment names and schedules automatically
- Converts complex treatment protocols into structured data
- Generates MDX content files with proper frontmatter

### 2. **Interactive Treatment Visualization**
- Visual treatment calendars with day-by-day medication schedules
- Color-coded treatment icons (pills, injections, IV drips, radiation)
- Responsive grid layouts optimized for mobile and desktop
- Treatment legends for easy reference

### 3. **Multi-Hospital Support**
- Customizable headers and branding for different institutions
- Support for NUH, NCIS, and HEH configurations
- Institution-specific logos and color schemes

### 4. **Content Management**
- MDX-based content with structured frontmatter
- Automated content generation from PDFs
- Version control for treatment protocols
- Easy content updates and maintenance

## Technical Stack

### Framework & Build Tools
- **Astro 5.7.10**: Static site generator with component islands
- **MDX 4.2.6**: Markdown with JSX for rich content
- **Tailwind CSS 4.1.0**: Utility-first styling framework
- **Vite**: Fast build tool and development server

### PDF Processing
- **AsposePDF**: Enterprise-grade PDF text extraction
- **pdf-parse**: Lightweight PDF parsing
- **csv-parse**: Structured data processing
- **fs-extra**: Enhanced file system operations

### Content & Data
- **Astro Content Collections**: Type-safe content management
- **JSON**: Treatment data and configuration storage
- **TypeScript**: Type safety and better developer experience

## Project Structure

```
micro-content/
├── public/                    # Static assets
│   ├── fonts/                 # Open Sans font families
│   ├── icons/                 # Treatment and UI icons
│   └── *.png, *.svg          # Hospital logos and assets
├── src/
│   ├── assets/               # Build-time assets
│   ├── components/           # Reusable Astro components
│   ├── content/              # MDX content files
│   │   └── pil/             # Patient Information Leaflets
│   ├── data/                # JSON data files
│   ├── layouts/             # Page layout templates
│   ├── pages/               # Route-based pages
│   ├── styles/              # CSS stylesheets
│   └── utils/               # Utility functions and scripts
│       └── extract/         # PDF processing pipeline
├── astro.config.mjs         # Astro configuration
├── package.json            # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

## Components

### Core Components

#### `Header.astro`
- NUHS branding with signature colorful bars
- Responsive navigation structure
- Institution-specific variants (Header-nuh.astro, Header-ncis.astro)

#### `TreatmentGrid.astro`
- Responsive grid layout for treatment schedules
- Calculates grid columns based on treatment cycle length
- Integrates with TreatmentCard components

#### `TreatmentCard.astro`
- Individual day representation in treatment schedules
- Dynamic icon rendering based on treatment type
- Color-coded visual indicators
- Accessibility features with proper ARIA labels

#### `IconsLegend.astro`
- Treatment reference table
- Maps treatment names to visual icons
- Helps patients understand the visual vocabulary

#### `Accordion.astro`
- Collapsible content sections
- Used for organizing complex medical information
- Enhances content readability and navigation

### Layout System

#### `Layout.astro`
- Base layout with NUH header and footer
- Global styles and meta tags
- Standard page structure

#### `PilLayout.astro`
- Specialized layout for PIL content
- NCIS header for cancer-specific branding
- Treatment grid integration

#### `IndexLayout.astro`
- Alternative layout for landing pages
- Flexible content structure

## Content Management

### Content Schema
PIL content is managed through Astro's Content Collections with the following schema:

```typescript
{
  title: string;           // Treatment protocol name
  description: string;     // Brief treatment description
  slug: string;           // URL-friendly identifier
  tags: string[];         // Content categorization
  category: string;       // Treatment category
  pubDate: Date;          // Publication date
  draft: boolean;         // Draft status
  days: number;           // Treatment cycle length
  treatments: string[];   // List of treatments in protocol
  treatmentSchedule: {    // Day-by-day schedule
    day: number;
    treatments: string[];
  }[];
}
```

### Treatment Data Structure
Treatments are defined in `src/data/treatments.json`:

```json
{
  "name": "cisplatin",      // Internal identifier
  "label": "Cisplatin",     // Display name
  "icon": "drip"           // Icon type (drip, pill, inject, radiation, home)
}
```

### Icon System
- **drip-***: IV treatments (blue, green, orange, purple, red, yellow)
- **pill-***: Oral medications (blue, green, red)
- **inject-***: Injections and subcutaneous treatments
- **radiation-***: Radiation therapy (green, pink)
- **home**: Rest periods and days off treatment

## PDF Processing Pipeline

### Extraction Workflow

1. **Text Extraction** (`pdf-text-extractor.js`)
   - Uses AsposePDF for enterprise-grade text extraction
   - Handles complex PDF layouts and formatting
   - Preserves document structure for further processing

2. **Table Processing** (`pdf-table-extractor.js`)
   - Extracts tabular data to CSV format
   - Identifies treatment schedules in table format
   - Handles multi-page tables and complex layouts

3. **Treatment Matching** (`treatment-matcher.js`)
   - Maps extracted text to known treatment names
   - Uses fuzzy matching for variations in naming
   - Validates against treatment database

4. **Schedule Parsing** (`extractTreatmentSchedule.js`)
   - Identifies day ranges and treatment patterns
   - Handles exceptions and rest periods
   - Validates schedule consistency

5. **Content Generation** (`markdown-builder.js`)
   - Generates MDX files with proper frontmatter
   - Formats content sections (details, side effects)
   - Creates treatment schedule data structures

### Processing Features

#### Pattern Recognition
- Identifies various day range formats ("days 1-14", "day 1 to 14")
- Recognizes rest periods and treatment breaks
- Handles multiple treatment administrations per day

#### Content Cleaning
- Removes institutional headers and footers
- Standardizes medical terminology
- Preserves important safety information

#### Validation
- Ensures treatment schedules don't exceed cycle length
- Validates treatment names against database
- Checks for completeness of extracted information

## Data Flow

### Content Pipeline
```
1. PDF Upload → utils/pdfs/
2. Text Extraction → Raw text data
3. Treatment Identification → Matched treatments
4. Schedule Parsing → Day-by-day schedule
5. MDX Generation → content/pil/
6. Astro Build → Static pages
7. Web Deployment → Patient-facing interface
```

### Build Process
```
1. Content Collection Parsing
2. Component Rendering
3. Static Page Generation
4. Asset Optimization
5. Production Build
```

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Process new PDFs
npm run extract-pdfs

# Build for production
npm run build

# Preview production build
npm run preview
```

### Adding New Treatment Protocols

1. **PDF Preparation**
   - Place PDF file in `src/utils/pdfs/`
   - Ensure file follows naming convention: `PIL-[number] - [treatment name].pdf`

2. **Content Extraction**
   - Run `npm run extract-pdfs`
   - Review generated MDX file in `src/content/pil/`
   - Verify treatment schedule accuracy

3. **Manual Review**
   - Check extracted content for accuracy
   - Verify treatment names and schedules
   - Update treatment data if new treatments identified

4. **Testing**
   - Test PIL page rendering
   - Verify treatment grid displays correctly
   - Check responsive behavior

### Content Updates

1. **Direct MDX Editing**
   - Edit files in `src/content/pil/`
   - Modify frontmatter for metadata changes
   - Update content sections as needed

2. **Treatment Data Updates**
   - Modify `src/data/treatments.json`
   - Add new treatment definitions
   - Update icon associations

3. **Component Modifications**
   - Update treatment icons in `public/icons/`
   - Modify component logic in `src/components/`
   - Test changes across different PILs

## Deployment

### Build Configuration
- Compression disabled for development clarity
- CSS inlined for self-contained pages
- Static generation for optimal performance

### Production Considerations
- Ensure all treatment icons are included
- Verify font loading for Open Sans
- Test responsive behavior across devices
- Validate accessibility features

### Performance Optimization
- Static site generation for fast loading
- Optimized image formats (WebP support)
- Minimal JavaScript payload
- Efficient CSS delivery

## Styling System

### Design Principles
- **Medical-Grade Clarity**: High contrast, legible typography
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG compliance for healthcare content
- **Brand Consistency**: NUHS/NCIS visual identity

### Color Palette
- **NUHS Orange**: #E57200
- **NUHS Red**: #E4002B  
- **NUHS Blue**: #00A9E0
- **NUHS Navy**: #002F6C

### Typography
- **Primary Font**: Open Sans (variable)
- **Fallbacks**: System fonts for reliability
- **Optimal Loading**: `font-display: swap`

## Future Enhancements

### Potential Improvements
- Multi-language support for diverse patient populations
- Interactive treatment calendars with progress tracking
- Integration with hospital management systems
- Patient feedback and rating systems
- Mobile app companion

### Technical Roadmap
- Enhanced PDF processing with AI/ML
- Real-time content updates
- Advanced analytics and usage tracking
- API endpoints for external integrations

## Troubleshooting

### Common Issues
- **PDF Extraction Failures**: Check PDF format and text extractability
- **Treatment Matching**: Verify treatment names in database
- **Schedule Parsing**: Review day range formats in source PDFs
- **Build Errors**: Check MDX frontmatter syntax

### Support
For technical issues or content updates, refer to the project repository or contact the development team.

---

*This documentation provides a comprehensive overview of the Micro-Content system. For specific implementation details, refer to the source code and inline comments.*