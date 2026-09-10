import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("../vendor/xlsx.full.min.js");
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const failures = [];

for (const file of [
  "index.html",
  "404.html",
  "styles.css",
  "js/config.js",
  "js/app.js",
  "assets/brand-mark.svg",
  "vendor/supabase.js",
  "vendor/xlsx.full.min.js",
  "templates/CA4_mau_nhap_de.xlsx",
  "docs/QUY_DINH_FORMAT_CA4.md",
  "supabase/schema.sql",
  "supabase/config.toml",
  "supabase/bootstrap_admin.sql",
  "supabase/functions/ca4-api/index.ts",
]) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Thiếu file: ${file}`);
}

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const ref of ["styles.css", "vendor/supabase.js", "vendor/xlsx.full.min.js", "js/config.js", "js/app.js", "assets/brand-mark.svg"]) {
  if (!html.includes(ref)) failures.push(`index.html thiếu tham chiếu ${ref}`);
}

const config = fs.readFileSync(path.join(root, "js/config.js"), "utf8");
if (!config.includes("https://umrdfacxezbxtjhomqbs.supabase.co")) failures.push("Sai Supabase Project URL.");
if (/service_role|SUPABASE_SERVICE_ROLE_KEY/.test(config)) failures.push("Frontend chứa service role.");

const workbookBytes = fs.readFileSync(path.join(root, "templates/CA4_mau_nhap_de.xlsx"));
const workbook = XLSX.read(workbookBytes, { type: "buffer" });
for (const name of ["THONG_TIN", "TINH_HUONG", "CAU_HOI"]) if (!workbook.SheetNames.includes(name)) failures.push(`File mẫu thiếu sheet ${name}`);
const questions = XLSX.utils.sheet_to_json(workbook.Sheets.CAU_HOI, { defval: "" });
if (questions.length !== 60) failures.push(`File mẫu có ${questions.length} dòng câu hỏi.`);
for (let n = 1; n <= 60; n += 1) {
  const row = questions[n - 1];
  if (Number(row?.so_cau) !== n) failures.push(`File mẫu sai số thứ tự tại dòng ${n + 1}.`);
  const expected = n <= 48 ? "DON" : n <= 54 ? "NHOM" : "NGAN";
  if (row?.loai_cau !== expected) failures.push(`File mẫu sai loại câu ${n}.`);
  const group = n >= 49 && n <= 51 ? "N1" : n >= 52 && n <= 54 ? "N2" : "";
  if ((row?.ma_nhom || "") !== group) failures.push(`File mẫu sai nhóm câu ${n}.`);
}
const levelCounts = questions.reduce((acc, row) => { acc[row.muc_do] = (acc[row.muc_do] || 0) + 1; return acc; }, {});
if (levelCounts.BIET !== 12 || levelCounts.HIEU !== 18 || levelCounts.VANDUNG !== 30) failures.push("File mẫu sai tỷ lệ mức độ.");
const totalPoints = questions.reduce((sum, row) => sum + Number(row.diem || 0), 0);
if (Math.abs(totalPoints - 70) > 0.01) failures.push(`Tổng điểm file mẫu là ${totalPoints}.`);

const edge = fs.readFileSync(path.join(root, "supabase/functions/ca4-api/index.ts"), "utf8");
if (!edge.includes("question_keys")) failures.push("Edge Function chưa dùng bảng đáp án riêng.");
if (!edge.includes("requireAdmin")) failures.push("Edge Function thiếu kiểm tra quản trị.");
if (!edge.includes("start_exam_attempt")) failures.push("Edge Function thiếu kiểm soát lượt bắt đầu.");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`PASS: ${questions.length} câu; BIET=${levelCounts.BIET}, HIEU=${levelCounts.HIEU}, VANDUNG=${levelCounts.VANDUNG}; tổng điểm=${totalPoints.toFixed(2)}.`);
