// Location: src/utils/extract/extractTreatmentSchedule.js

/**
 * Analyzes treatment section text to extract a structured treatment schedule
 * @param {string} treatmentText - The text from the treatment details section
 * @param {number} cycleDays - Total days in the treatment cycle
 * @param {string[]} treatments - Array of treatment names
 * @returns {Array<{day: number, treatments: string[]}>} - Day-by-day treatment schedule
 */
export function extractTreatmentSchedule(treatmentText, cycleDays, treatments) {
    // Initialize schedule array with empty treatment arrays for each day
    const schedule = Array.from({ length: cycleDays }, (_, i) => ({
      day: i + 1,
      treatments: []
    }));
    
    if (!treatmentText || !treatments || treatments.length === 0) {
      console.warn("Missing treatment text or treatments array");
      return schedule;
    }
    
    // Process Capecitabine (days 1-14 pattern)
    if (treatments.includes("Capecitabine") && 
        /capecitabine.*?days\s+1\s+to\s+14/i.test(treatmentText)) {
      for (let i = 0; i < 14; i++) {
        schedule[i].treatments.push("Capecitabine");
      }
    }
    
    // Process Lapatinib (days 1-21 pattern)
    if (treatments.includes("Lapatinib") && 
        /lapatinib.*?days\s+1\s+to\s+21/i.test(treatmentText)) {
      for (let i = 0; i < cycleDays; i++) {
        schedule[i].treatments.push("Lapatinib");
      }
    }
    
    // For other treatments, parse treatment patterns
    const dayRangePattern = /(\w+)\s+(?:is|will be|are)\s+.*?\s+(?:on|from)\s+days?\s+(\d+)(?:\s+to\s+(\d+))?/ig;
    let match;
    
    while ((match = dayRangePattern.exec(treatmentText)) !== null) {
      const treatmentName = match[1];
      const startDay = parseInt(match[2], 10);
      const endDay = match[3] ? parseInt(match[3], 10) : startDay;
      
      const canonicalTreatment = treatments.find(t => 
        t.toLowerCase().includes(treatmentName.toLowerCase())
      );
      
      if (canonicalTreatment && startDay >= 1 && endDay <= cycleDays) {
        for (let day = startDay; day <= endDay; day++) {
          if (!schedule[day-1].treatments.includes(canonicalTreatment)) {
            schedule[day-1].treatments.push(canonicalTreatment);
          }
        }
      }
    }
    
    // Ensure no days have empty treatment arrays
    schedule.forEach(dayInfo => {
      if (dayInfo.treatments.length === 0) {
        dayInfo.treatments.push("Rest");
      }
    });
    
    return schedule;
  }
  