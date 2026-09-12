import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("../vendor/xlsx.full.min.js");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
  "supabase/migrations/20260911_exam_assignments.sql",
  "supabase/config.toml",
  "supabase/bootstrap_admin.sql",
  "supabase/functions/ca4-api/index.ts",
]) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Thiáº¿u file: ${file}`);
}

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const ref of ["styles.css", "vendor/supabase.js", "vendor/xlsx.full.min.js", "js/config.js", "js/app.js", "assets/brand-mark.svg"]) {
  if (!html.includes(ref)) failures.push(`index.html thiáº¿u tham chiáº¿u ${ref}`);
}

const config = fs.readFileSync(path.join(root, "js/config.js"), "utf8");
if (!config.includes("https://umrdfacxezbxtjhomqbs.supabase.co")) failures.push("Sai Supabase Project URL.");
if (/service_role|SUPABASE_SERVICE_ROLE_KEY/.test(config)) failures.push("Frontend chá»©a service role.");

const workbookBytes = fs.readFileSync(path.join(root, "templates/CA4_mau_nhap_de.xlsx"));
const workbook = XLSX.read(workbookBytes, { type: "buffer" });
for (const name of ["THONG_TIN", "TINH_HUONG", "CAU_HOI"]) if (!workbook.SheetNames.includes(name)) failures.push(`File máº«u thiáº¿u sheet ${name}`);
const questions = XLSX.utils.sheet_to_json(workbook.Sheets.CAU_HOI, { defval: "" });
if (questions.length !== 60) failures.push(`File máº«u cÃ³ ${questions.length} dÃ²ng cÃ¢u há»i.`);
for (let n = 1; n <= 60; n += 1) {
  const row = questions[n - 1];
  if (Number(row?.so_cau) !== n) failures.push(`File máº«u sai sá»‘ thá»© tá»± táº¡i dÃ²ng ${n + 1}.`);
  const expected = n <= 48 ? "DON" : n <= 54 ? "NHOM" : "NGAN";
  if (row?.loai_cau !== expected) failures.push(`File máº«u sai loáº¡i cÃ¢u ${n}.`);
  const group = n >= 49 && n <= 51 ? "N1" : n >= 52 && n <= 54 ? "N2" : "";
  if ((row?.ma_nhom || "") !== group) failures.push(`File máº«u sai nhÃ³m cÃ¢u ${n}.`);
}
const levelCounts = questions.reduce((acc, row) => { acc[row.muc_do] = (acc[row.muc_do] || 0) + 1; return acc; }, {});
if (levelCounts.BIET !== 12 || levelCounts.HIEU !== 18 || levelCounts.VANDUNG !== 30) failures.push("File máº«u sai tá»· lá»‡ má»©c Ä‘á»™.");
const totalPoints = questions.reduce((sum, row) => sum + Number(row.diem || 0), 0);
if (Math.abs(totalPoints - 70) > 0.01) failures.push(`Tá»•ng Ä‘iá»ƒm file máº«u lÃ  ${totalPoints}.`);

const edge = fs.readFileSync(path.join(root, "supabase/functions/ca4-api/index.ts"), "utf8");
if (!edge.includes("question_keys")) failures.push("Edge Function chÆ°a dÃ¹ng báº£ng Ä‘Ã¡p Ã¡n riÃªng.");
if (!edge.includes("requireAdmin")) failures.push("Edge Function thiáº¿u kiá»ƒm tra quáº£n trá»‹.");
if (!edge.includes("start_exam_attempt")) failures.push("Edge Function thiáº¿u kiá»ƒm soÃ¡t lÆ°á»£t báº¯t Ä‘áº§u.");
if (!edge.includes("exam_assignments")) failures.push("Edge Function thiáº¿u kiá»ƒm soÃ¡t giao bÃ i.");

const schema = fs.readFileSync(path.join(root, "supabase/schema.sql"), "utf8");
if (!schema.includes("create table if not exists public.exam_assignments")) failures.push("Schema thiáº¿u báº£ng giao bÃ i.");
if (!schema.includes("admin_update_exam_settings")) failures.push("Schema thiáº¿u hÃ m cáº­p nháº­t pháº¡m vi bÃ i kiá»ƒm tra.");

const frontend = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
if (!frontend.includes('value="assigned"')) failures.push("Frontend thiáº¿u tráº¡ng thÃ¡i giao theo há»c viÃªn.");
if (!frontend.includes("assigned_user_ids")) failures.push("Frontend thiáº¿u danh sÃ¡ch há»c viÃªn Ä‘Æ°á»£c giao.");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`PASS: ${questions.length} cÃ¢u; BIET=${levelCounts.BIET}, HIEU=${levelCounts.HIEU}, VANDUNG=${levelCounts.VANDUNG}; tá»•ng Ä‘iá»ƒm=${totalPoints.toFixed(2)}.`);

