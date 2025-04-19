import AsposePdf from "asposepdfnodejs";
import fs from "fs-extra";
import { parse as csvParse } from "csv-parse/sync";

export async function extractTables(filePath, csvPattern) {
  const asposePdfModule = await AsposePdf();
  const csvJson = asposePdfModule.AsposePdfTablesToCSV(filePath, csvPattern, "\t");
  let tablesByPage = {};
  if (csvJson.errorCode === 0 && Array.isArray(csvJson.filesNameResult)) {
    for (const csvFile of csvJson.filesNameResult) {
      const pageNum = parseInt(csvFile.match(/page(\d+)\.csv$/)[1], 10);
      const csvContent = fs.readFileSync(csvFile, "utf8");
      const records = csvParse(csvContent, {
        delimiter: "\t",
        skip_empty_lines: true,
      });
      tablesByPage[pageNum] = records;
    }
  }
  return tablesByPage;
}
