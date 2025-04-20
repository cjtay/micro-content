import { FIXED_DISCLAIMER, CONTACT_SECTION } from "./config.js";

export function buildMarkdown(frontmatter, title, markdownBody) {
  // Extract 'days' from the frontmatter string or pass it as an argument
  const daysMatch = frontmatter.match(/days:\s*(\d+)/);
  const days = daysMatch ? daysMatch[1] : "0"; // Default to '0' if not found

  // Construct the final markdown document
  const markdown = `---
${frontmatter}
---

export const days = frontmatter.days;
export const treatments = frontmatter.treatments;
export const treatmentSchedule = frontmatter.treatmentSchedule;
import TreatmentGrid from '../../components/TreatmentGrid.astro';

# ${title}

<TreatmentGrid treatmentSchedule={treatmentSchedule} />

${markdownBody}

${FIXED_DISCLAIMER}

${CONTACT_SECTION}
`;
  
  return markdown;
}
