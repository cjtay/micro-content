import { FIXED_DISCLAIMER, CONTACT_SECTION } from "./config.js";

export function buildMarkdown(frontmatter, title, markdownBody) {
	// Extract 'days' from the frontmatter string or pass it as an argument
	// This is a basic example assuming 'days' is a simple key-value pair like 'days: 7'
	const daysMatch = frontmatter.match(/days:\s*(\d+)/);
	const days = daysMatch ? daysMatch[1] : "0"; // Default to '0' if not found

	// Construct the TreatmentCard grid component string
	const treatmentGrid = `<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2 my-8">
  {Array.from({ length: Number(days) }).map((_, i) => (
    <TreatmentCard key={i} title={\`Day \${i + 1}\`} />
  ))}
</div>`;

	// Assemble the final MDX string, including the import and export *as text*
	return `---
${frontmatter}
---

export const days = frontmatter.days;
export const treatments = frontmatter.treatments;
import TreatmentGrid from '../../components/TreatmentGrid.astro';

# ${title}

<TreatmentGrid days={Number(days)} treatments={treatments} />

${markdownBody}

${CONTACT_SECTION}

${FIXED_DISCLAIMER}
`;
}
