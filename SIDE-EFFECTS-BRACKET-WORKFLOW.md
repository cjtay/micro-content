# Side Effects Bracketed Content Update Workflow

## Purpose & Overview

This workflow documents the process for identifying and updating missing bracketed content in Patient Information Leaflet (PIL) markdown files. The bracketed content provides additional details about side effects that are present in the source PDF files but missing from the corresponding MDX files.

**Key Objective**: Extract bracketed descriptions (e.g., "(Monitored by specific blood tests)", "(Cough, Shortness of breath, fever)") from PDF files and add them to the appropriate side effects arrays in MDX files.

## Input Requirements

### PDF Files
- **Location**: `/Users/cjtay/Desktop/pil-working-batches/batch-X/`
- **Naming Pattern**: `PIL-XXXX.X - [Treatment Name].pdf`
- **Examples**: 
  - `PIL-0182.2 - Eribulin and SC Trastuzumab 2.pdf`
  - `PIL-0183.1 - Eribulin and IV Trastuzumab and Pertuzumab.pdf`

### MDX Files
- **Location**: `/Users/cjtay/Documents/micro-content/src/content/pil/`
- **Naming Pattern**: `PIL-XXXX-X.mdx` (note: periods become hyphens)
- **Examples**:
  - `PIL-0182-2.mdx`
  - `PIL-0183-1.mdx`

## Process Steps

### 1. Initial Setup
```bash
# Start by reading the PDF file
# Example user command: "/path/to/PIL-XXXX.pdf - do the same for this file"
```

### 2. Analysis Phase
1. **Read PDF file** using Read tool
2. **Read corresponding MDX file** using Read tool  
3. **Compare side effects sections** between PDF and MDX
4. **Identify missing bracketed content** in these arrays:
   - `commonSideEffects` (usually complete with descriptions)
   - `otherCommonSideEffects` 
   - `occasionalSideEffects`
   - `rareSideEffects`

### 3. Planning Phase
- **Create todo list** with TodoWrite tool
- **Present plan** using ExitPlanMode tool showing:
  - Which sections need updates
  - What bracketed content will be added
  - Line numbers for reference

### 4. Implementation Phase
- **Use MultiEdit tool** to make all changes in a single operation
- **Update todo list** to mark tasks as completed
- **Confirm successful updates**

## Side Effects Categories

### commonSideEffects
- Usually contains full descriptions already
- Rarely needs bracketed content updates
- Format: `{name: "...", description: "..."}`

### otherCommonSideEffects
- Often missing bracketed descriptions
- Format: `{name: "Side effect name"}`
- **Common Missing Brackets**:
  - "Cardiac problems" → "(Chest pain or tightness, irregular heartbeat or blood pressure changes, shortness of breath)"
  - "Lung/Breathing problems" → "(Cough, Shortness of breath, fever)"
  - "Liver dysfunction" → "(Monitored by specific blood tests)"

### occasionalSideEffects
- Frequently missing bracketed descriptions
- **Common Missing Brackets**:
  - "Neurological disorder" → "(Report to your oncology team about headache, confusion, vision changes, drooping eyelids, swallowing difficulty or difficult movements)"
  - "Urine infection" → "(pain or burning while urinating, frequent urge to urinate and dark or cloudy urine)"
  - "Poor kidney functioning" → "(Monitored by specific blood tests)"
  - "Hand-Foot Syndrome" → "(Swelling, redness, burning sensation in the palms and soles)"
  - "Electrolyte imbalance" → "(Monitored by specific blood tests)"

### rareSideEffects
- Often missing bracketed descriptions
- **Common Missing Brackets**:
  - "Pancreas inflammation" → "(Monitored by specific blood tests)"
  - "Severe skin problems" → "(Redness, peeling and blister with or without fever)"
  - "Blood clots" → "(Life-threatening)"
  - "Haemoptysis" → "(coughing up blood)"

## Common Bracketed Content Patterns

### Monitoring-Related
- `(Monitored by specific blood tests)`
- `(Monitored by specific tests)`

### Symptom Descriptions
- `(Chest pain or tightness, irregular heartbeat or blood pressure changes, shortness of breath)`
- `(Cough, Shortness of breath, fever)`
- `(pain or burning while urinating, frequent urge to urinate and dark or cloudy urine)`
- `(redness, swelling, itching, pain at the site of injection)`

### Severity Indicators
- `(Life-threatening)`
- `(Redness, peeling and blister with or without fever)`

### Instructions to Medical Team
- `(Report to your oncology team about headache, confusion, vision changes, drooping eyelids, swallowing difficulty or difficult movements)`

## Examples

### Before Update
```yaml
otherCommonSideEffects: [
  { name: "Cardiac problems" },
  { name: "Lung/Breathing problems" }
]
```

### After Update
```yaml
otherCommonSideEffects: [
  { name: "Cardiac problems (Chest pain or tightness, irregular heartbeat or blood pressure changes, shortness of breath)" },
  { name: "Lung/Breathing problems (Cough, Shortness of breath, fever)" }
]
```

## Todo List Management

### Standard Todo Structure
```javascript
[
  {
    "content": "Update otherCommonSideEffects in PIL-XXXX-X.mdx with missing bracketed descriptions",
    "status": "pending", // pending, in_progress, completed
    "priority": "high",
    "id": "update-other-common-side-effects-XXXX-X"
  }
]
```

### Task Categories
1. **Analysis tasks**: "Analyze PIL-XXXX PDF and MDX for missing bracketed content"
2. **Update tasks**: "Update [sectionName] in PIL-XXXX.mdx with missing bracketed descriptions"

### Status Management
- Mark **one task as in_progress** at a time
- Mark tasks as **completed** immediately after finishing
- Create **separate tasks** for each side effects section

## Quality Checks

### After Each Update
1. **Verify all planned changes were applied** correctly
2. **Check that bracketed content matches PDF source**
3. **Ensure no syntax errors** in MDX frontmatter
4. **Confirm todo list is updated** with completed status

### Common Validation Points
- Bracketed content is enclosed in parentheses
- Commas and periods are correctly placed
- Capitalization matches PDF source
- No trailing or leading spaces in brackets

## File Naming Conventions

### PDF to MDX Mapping
- PDF: `PIL-0182.2` → MDX: `PIL-0182-2.mdx`
- PDF: `PIL-0183.1` → MDX: `PIL-0183-1.mdx`
- PDF: `PIL-0188` → MDX: `PIL-0188.mdx`

**Rule**: Replace periods with hyphens in MDX filenames

### Directory Structure
```
/Users/cjtay/Desktop/pil-working-batches/batch-X/
├── PIL-XXXX.X - [Treatment Name].pdf

/Users/cjtay/Documents/micro-content/src/content/pil/
├── PIL-XXXX-X.mdx
```

## Troubleshooting

### PDF File Not Found
- Verify the exact file path provided by user
- Check for special characters or spaces in filename
- Use Read tool with full absolute path

### MDX File Not Found
- Convert PDF filename to MDX format (periods → hyphens)
- Check if file exists in `/Users/cjtay/Documents/micro-content/src/content/pil/`

### No Missing Bracketed Content
- Some files may already be complete
- Report to user that no updates are needed
- Example: PIL-0154 was already complete

### MultiEdit Failures
- Ensure `old_string` matches exactly (including whitespace)
- Check that `old_string` and `new_string` are different
- Verify MDX file was read before editing

### Common Side Effects Already Complete
- `commonSideEffects` typically have full descriptions
- Focus on `otherCommonSideEffects`, `occasionalSideEffects`, `rareSideEffects`
- Some sections may already have brackets (e.g., PIL-0183-2 occasionalSideEffects)

## Special Cases

### Immune Side Effects
- Some files (PIL-0167, PIL-0168) also have `immuneSideEffects` arrays
- These are for immunotherapy drugs (atezolizumab, pembrolizumab)
- Follow established pattern for adding immune side effects if requested

### Mixed Content
- Some entries may have partial bracketed content
- Some may be complete while others in same section are missing brackets
- Focus only on entries that are missing brackets

## Workflow Summary

1. **Receive user request** with PDF file path
2. **Read PDF file** and corresponding MDX file
3. **Analyze and compare** side effects sections
4. **Create todo list** for tracking progress
5. **Present plan** for user approval
6. **Execute updates** using MultiEdit tool
7. **Update todo list** to completed status
8. **Confirm completion** to user

This workflow ensures consistent, systematic updates to PIL files while maintaining quality and traceability.