# Micro-Content: Medical PIL Management System

A web application for Singapore's National University Hospital (NUH) and National Cancer Institute Singapore (NCIS) to manage and display Patient Information Leaflets (PILs) for cancer treatments.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Process PDFs into content
npm run extract-pdfs

# Build for production
npm run build
```

## Overview

This system automates the conversion of PDF treatment protocols into interactive, web-based patient education materials with:

- 🤖 Automated PDF extraction and processing
- 📅 Visual treatment calendars with day-by-day schedules
- 🎨 Color-coded treatment icons (57 treatments supported)
- 🏥 Multi-hospital branding support (NUH, NCIS, HEH)
- 📱 Responsive design for all devices

## Documentation

For comprehensive documentation including:
- Technical architecture
- PDF processing pipeline
- Component documentation
- Development guidelines
- AI/Claude-specific instructions

**See [CLAUDE.md](./CLAUDE.md)**

## Tech Stack

- **Astro** 5.7.10 - Static site generator
- **Tailwind CSS** 4.1.0 - Styling (via Vite plugin)
- **MDX** 4.2.6 - Content format
- **TypeScript** - Type safety

## Project Structure

```
src/
├── content/
│   ├── pil/     # Patient Information Leaflets
│   └── basic/   # Basic content pages
├── components/  # Reusable Astro components
├── utils/       # PDF extraction utilities
└── data/        # Treatment definitions
```

## License

Property of National University Health System (NUHS), Singapore.

---

For detailed documentation, please refer to [CLAUDE.md](./CLAUDE.md).