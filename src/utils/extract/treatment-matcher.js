export function matchTreatments(treatmentsRaw, treatmentNameToLabel, treatmentSectionText) {
    const foundLabels = new Set();
    const treatmentNamesLower = Object.keys(treatmentNameToLabel);
  
    // 1. Match all canonical treatments (case-insensitive, whole-word)
    for (const candidate of treatmentsRaw) {
      let foundAny = false;
      for (const tNameLower of treatmentNamesLower) {
        const regex = new RegExp(`\\b${escapeRegExp(tNameLower)}\\b`, "i");
        if (regex.test(candidate.toLowerCase())) {
          foundLabels.add(treatmentNameToLabel[tNameLower]);
          foundAny = true;
        }
      }
      // 2. If bullet does not mention any known treatment, treat as rest
      if (!foundAny && isRestLike(candidate)) {
        foundLabels.add(treatmentNameToLabel["rest"] || "Rest");
      }
    }
  
    // 3. If any rest-like phrase in the whole section, add rest
    if (shouldAddRest(treatmentSectionText)) {
      foundLabels.add(treatmentNameToLabel["rest"] || "Rest");
    }
  
    return Array.from(foundLabels);
  }
  
  function shouldAddRest(sectionText) {
    const restPhrases = [
      "no treatment",
      "won't have any treatment",
      "won’t have any treatment",
      "won't be having any treatment",
      "won’t be having any treatment",
      "rest and recover",
      "resting",
      "rest",
      "no anti-cancer treatment",
      "won't have any anti-cancer treatment",
      "won’t have any anti-cancer treatment",
      "take this time to rest",
      "you won't be having any anti-cancer treatment",
      "you won’t be having any anti-cancer treatment",
      "you won't have any anti-cancer treatment",
      "you won’t have any anti-cancer treatment",
    ];
    const lower = (sectionText || "").toLowerCase();
    if (restPhrases.some(phrase => lower.includes(phrase))) return true;
  
    // Heuristic: look for negation + treatment/therapy/medication
    if (
      /\b(no|not|none|without|won't|will not|free of)\b.*\b(treatment|therapy|medication|drug|chemo|medicine)\b/.test(lower)
    ) {
      return true;
    }
    // Heuristic: look for rest-related verbs or phrases
    if (
      /\b(rest|recover|break|pause|holiday|off|free|skip|resting)\b/.test(lower)
    ) {
      return true;
    }
    return false;
  }
  
  // Heuristic for rest-like bullet points (no known treatment mentioned)
  function isRestLike(text) {
    const lower = (text || "").toLowerCase();
    // If the bullet is short and contains rest-like words
    if (
      /\b(rest|recover|break|pause|holiday|off|free|skip|resting)\b/.test(lower)
    ) {
      return true;
    }
    // If it contains negation + treatment/therapy/medication
    if (
      /\b(no|not|none|without|won't|will not|free of)\b.*\b(treatment|therapy|medication|drug|chemo|medicine)\b/.test(lower)
    ) {
      return true;
    }
    // If it looks like a statement of "no treatment"
    if (
      /won'?t (be )?(have|having|receive|receiving) any( anti-cancer)? treatment/.test(lower)
    ) {
      return true;
    }
    // If it mentions "rest and recover"
    if (lower.includes("rest and recover")) {
      return true;
    }
    return false;
  }
  
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  