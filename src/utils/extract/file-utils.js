import fs from "fs-extra";

export function ensureDirs(dirs) {
  dirs.forEach(dir => fs.ensureDirSync(dir));
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function writeFileSync(filePath, data) {
  fs.writeFileSync(filePath, data);
}
