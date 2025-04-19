import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PDFFOLDER = path.join(__dirname, "../../utils/pdfs");
export const CONTENTFOLDER = path.join(__dirname, "../../content/pil");
export const TMPFOLDER = path.join(__dirname, "../../../tmp_pdf_tables");
export const TREATMENTS_JSON_PATH = path.join(__dirname, "../../data/treatments.json");

export const SECTION_HEADERS = [
  "About the treatment",
  "Treatment details",
  "Side Effects",
  "Common Side Effects",
  "Other Common Side Effects",
  "Occasional Side Effects",
  "Rare Side Effects",
  "Food & Drink",
  "Pregnancy, Contraception and Breastfeeding",
  "Fertility",
  "Immunisations",
  "Alcohol",
  "Exercise",
];

export const FIXED_DISCLAIMER =
  "> _Patient Information Use and Disclaimer: this is not a complete list of side effects. Always consult your healthcare provider to ensure the information displayed on this page applies to your personal circumstances._";

export const CONTACT_SECTION = `
---
## How to contact your Healthcare Team
<span class="text-red-500 font-bold text-xl">
Cancer Line (+65) 9722 0569
</span>

- 8:30 am - 5:30 pm (Mondays - Fridays)
- Closed on Weekends & Public Holidays
- For non-operating hours, weekends, and public holidays, please go to your nearest Emergency Department.

### Contact your healthcare team as soon as possible if:
- You have severe side effects.
- Your side effects aren’t getting any better.
- Your side effects are getting worse.

### Seek medical attention if you develop the following:
- Soon after treatment, signs of an allergic reaction include rashes, face swelling, dizziness, chest tightness, a fast heartbeat, or breathing difficulties.
- Symptoms of an infection include fever (temperature over 38°C), chills, severe sore throat, wet cough (coughing up thick or green phlegm), and cloudy or foul-smelling urine.
- Signs of unusual bleeding, bruising, or dark and sticky stools.
- Feeling unwell (despite not having a fever).`;
