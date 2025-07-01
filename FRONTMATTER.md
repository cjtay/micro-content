# Frontmatter Corrections System

## Overview

The Frontmatter Corrections System allows you to fix extracted content frontmatter without regenerating files from PDFs. This is particularly useful for correcting titles, descriptions, side effects, and other metadata that may have been incorrectly extracted during the automated PDF processing.

The system uses individual YAML correction files stored in `src/utils/corrections/` directory and applies them to MDX files in `src/content/pil/`, outputting corrected versions to `src/content/pil-update/`.

## File Structure

```
src/utils/
├── corrections/                  # Frontmatter correction files
│   ├── PIL-0001.yaml            # Individual correction file
│   ├── PIL-0002.yaml            # Another correction file
│   └── PIL-XXXXX.yaml           # More correction files...
└── frontmatter-corrections.js   # Frontmatter updater script
```

## Key Features

- **Individual correction files**: One YAML file per PIL for easier management
- **Partial updates**: Only include fields that need correction
- **Deep merging**: Nested objects are merged, arrays are replaced entirely
- **Supports all frontmatter fields**: title, treatments, side effects, etc.
- **Non-destructive**: Original files remain unchanged, corrected files go to separate directory

## Usage Guide

### 1. Create Correction Files

Create individual YAML files in `src/utils/corrections/` directory. Each file should be named after the PIL ID (e.g., `PIL-0001.yaml`).

**Example correction file (`corrections/PIL-0001.yaml`):**
```yaml
title: "Corrected Treatment Name"
description: "Updated description text"
commonSideEffects:
  [
    {
      name: "Corrected side effect",
      description: "Updated description"
    },
    {
      name: "Another side effect",
      description: "Another description"
    }
  ]
treatments:
  [
    {
      name: "Carboplatin",
      cycle: "Day 1",
      info: "Corrected treatment info",
      icon: "drip-blue"
    }
  ]
```

### 2. Run Corrections

```bash
# Navigate to utils directory
cd src/utils

# Run the correction script
node frontmatter-corrections.js
```

### 3. Review Output

Corrected files will be created in `src/content/pil-update/` directory:

```bash
# Compare original vs corrected
diff src/content/pil/PIL-0001.mdx src/content/pil-update/PIL-0001.mdx

# If satisfied, move corrected files to main directory
mv src/content/pil-update/PIL-0001.mdx src/content/pil/PIL-0001.mdx
```

## Correction File Format

### Basic Structure

```yaml
# Any frontmatter field can be corrected
title: "New title"
description: "New description"
tags: ["new", "tags"]
category: "updated-category"
```

### Arrays (Replaced Entirely)

When correcting arrays, the entire array is replaced:

```yaml
commonSideEffects:
  [
    {
      name: "Side effect 1",
      description: "Description 1"
    },
    {
      name: "Side effect 2", 
      description: "Description 2"
    }
  ]
```

### Nested Objects (Deep Merged)

For nested objects, only specified fields are updated:

```yaml
treatments:
  [
    {
      name: "Drug Name",
      cycle: "Updated cycle info",
      # Other fields (info, icon) remain unchanged if not specified
    }
  ]
```

### Treatment Schedule

```yaml
treatmentSchedule:
  [
    {
      day: 1,
      treatments: ["Drug A", "Drug B"]
    },
    {
      day: 2,
      treatments: ["Drug C"]
    }
  ]
```

## Running Corrections

### Script Usage

```bash
# Basic usage
node frontmatter-corrections.js

# The script will:
# 1. Look for correction files in src/utils/corrections/
# 2. Process matching MDX files from src/content/pil/
# 3. Output corrected files to src/content/pil-update/
# 4. Show what corrections were applied
```

### Output Example

```
Found 3 correction file(s)
Source: /path/to/src/content/pil
Output: /path/to/src/content/pil-update

Processing: PIL-0001.mdx
  ✓ Updated: PIL-0001.mdx → PIL-0001.mdx
    Applied corrections:
      title: "Corrected Treatment Name"
      commonSideEffects: [array with 2 items]

Processing: PIL-0002.mdx
  ✓ Updated: PIL-0002.mdx → PIL-0002.mdx
    Applied corrections:
      description: "Updated description"
```

## Workflow Integration

### As Part of PDF Processing Pipeline

```bash
# 1. Extract PDFs (generates initial content)
npm run extract-pdfs

# 2. Review generated content and identify issues
# 3. Create correction files in src/utils/corrections/
# 4. Apply corrections
cd src/utils && node frontmatter-corrections.js

# 5. Review corrected files
# 6. Move corrected files to main directory if satisfied
```

### Batch Processing

```bash
# Process all correction files at once
cd src/utils
node frontmatter-corrections.js

# Review all outputs
ls -la ../content/pil-update/

# Move all corrected files (if satisfied with all)
mv ../content/pil-update/*.mdx ../content/pil/
```

## Troubleshooting

### Common Issues

#### Corrections Directory Not Found
```
Error: corrections directory not found in "/path/to/src/utils"
```
**Solution**: Create the corrections directory:
```bash
mkdir src/utils/corrections
```

#### No Correction Files Found
```
No correction files found in corrections directory
```
**Solution**: Add YAML correction files to the corrections directory with proper naming (e.g., `PIL-0001.yaml`).

#### Source File Not Found
```
⚠️  Skipping: PIL-0001.mdx (source file not found)
```
**Solution**: Ensure the source MDX file exists in `src/content/pil/` and the correction file name matches the PIL ID.

#### YAML Syntax Errors
```
Error processing individual corrections: YAMLException: ...
```
**Solution**: Validate YAML syntax in correction files. Common issues:
- Incorrect indentation
- Missing quotes around strings with special characters
- Malformed array syntax

#### File Permission Issues
```
Error: EACCES: permission denied
```
**Solution**: Check file permissions on directories and files.

### Validation Checklist

Before running corrections:
- [ ] Corrections directory exists (`src/utils/corrections/`)
- [ ] Correction files use proper naming (`PIL-XXXXX.yaml`)
- [ ] YAML syntax is valid
- [ ] Source MDX files exist in `src/content/pil/`
- [ ] Output directory is writable

After running corrections:
- [ ] Review corrected files in `src/content/pil-update/`
- [ ] Compare changes with original files
- [ ] Test corrected files in development environment
- [ ] Move corrected files to main directory when satisfied

## Examples

### Example 1: Simple Title and Description Fix

**File**: `corrections/PIL-0001.yaml`
```yaml
title: "Carboplatin and Paclitaxel Treatment Protocol"
description: "Updated comprehensive treatment information for carboplatin and paclitaxel combination therapy"
```

### Example 2: Side Effects Correction

**File**: `corrections/PIL-0025.yaml`
```yaml
commonSideEffects:
  [
    {
      name: "Nausea and vomiting",
      description: "Most patients experience some nausea. Anti-nausea medications will be prescribed."
    },
    {
      name: "Fatigue",
      description: "Feeling tired is common. Rest when needed and maintain light activity."
    },
    {
      name: "Hair loss",
      description: "Hair loss typically begins 2-3 weeks after treatment starts."
    }
  ]
```

### Example 3: Treatment Information Update

**File**: `corrections/PIL-0042.yaml`
```yaml
treatments:
  [
    {
      name: "Pembrolizumab",
      cycle: "Every 3 weeks",
      info: "Immunotherapy administered via IV infusion over 30 minutes",
      icon: "drip-purple"
    }
  ]
treatmentSchedule:
  [
    {
      day: 1,
      treatments: ["Pembrolizumab"]
    }
  ]
```

### Example 4: Complex Multi-field Correction

**File**: `corrections/PIL-0033.yaml`
```yaml
title: "FOLFIRINOX Chemotherapy Protocol"
description: "Complete treatment protocol for FOLFIRINOX combination chemotherapy"
tags: ["chemotherapy", "folfirinox", "colorectal", "pancreatic"]
days: 14
treatments:
  [
    {
      name: "Oxaliplatin",
      cycle: "Day 1",
      info: "Given over 2 hours via IV",
      icon: "drip-blue"
    },
    {
      name: "Leucovorin",
      cycle: "Day 1",
      info: "Given over 2 hours via IV",
      icon: "drip-green"
    },
    {
      name: "Irinotecan",
      cycle: "Day 1", 
      info: "Given over 90 minutes via IV",
      icon: "drip-orange"
    },
    {
      name: "5-Fluorouracil",
      cycle: "Days 1-2",
      info: "Continuous infusion over 46 hours",
      icon: "drip-red"
    }
  ]
```

---

*This documentation covers the frontmatter correction system for the Micro-Content PIL management project. For general project information, see CLAUDE.md.*