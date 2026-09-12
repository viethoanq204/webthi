import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "file:///opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const workbook = Workbook.create();
const info = workbook.worksheets.add("THONG_TIN");
const passages = workbook.worksheets.add("TINH_HUONG");
const questions = workbook.worksheets.add("CAU_HOI");
const guide = workbook.worksheets.add("HUONG_DAN");
const font = "Arial";
const navy = "#102B4E";
const light = "#EAF1F7";
const line = "#D9E2EA";
const amber = "#FFF4D6";

function styleTable(sheet, range, headerRange) {
  sheet.showGridLines = false;
  sheet.getRange(range).format.font = { name: font, size: 10, color: "#17243A" };
  sheet.getRange(range).format.verticalAlignment = "center";
  sheet.getRange(headerRange).format = {
    fill: navy,
    font: { name: font, size: 10, bold: true, color: "#FFFFFF" },
    verticalAlignment: "center",
    horizontalAlignment: "center",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#FFFFFF" },
  };
}

info.getRange("A1:B8").values = [
  ["khoa", "gia_tri"],
  ["format_version", "CA4-1.0"],
  ["ten_bai_kiem_tra", ""],
  ["mo_ta", ""],
  ["thoi_gian_phut", 90],
  ["so_luot_lam", 0],
  ["thu_muc", "Đề thi thử"],
  ["trang_thai", "draft"],
];
styleTable(info, "A1:B8", "A1:B1");
info.getRange("A2:A8").format.fill = light;
info.getRange("A2:A8").format.font = { name: font, size: 10, bold: true, color: "#173B67" };
info.getRange("B2:B8").format.fill = amber;
info.getRange("A1:A8").format.columnWidth = 24;
info.getRange("B1:B8").format.columnWidth = 58;
info.getRange("A1:B8").format.rowHeight = 26;
info.getRange("B3:B4").format.wrapText = true;
info.getRange("B8").dataValidation = { rule: { type: "list", values: ["draft", "published"] } };
info.freezePanes.freezeRows(1);

passages.getRange("A1:B3").values = [
  ["ma_nhom", "noi_dung_tinh_huong"],
  ["N1", ""],
  ["N2", ""],
];
styleTable(passages, "A1:B3", "A1:B1");
passages.getRange("A2:A3").format.fill = light;
passages.getRange("A2:A3").format.font = { name: font, size: 10, bold: true, color: "#173B67" };
passages.getRange("B2:B3").format.fill = amber;
passages.getRange("A1:A3").format.columnWidth = 14;
passages.getRange("B1:B3").format.columnWidth = 110;
passages.getRange("B2:B3").format.wrapText = true;
passages.getRange("A1:B1").format.rowHeight = 30;
passages.getRange("A2:B3").format.rowHeight = 60;
passages.freezePanes.freezeRows(1);

const headers = ["so_cau", "loai_cau", "ma_nhom", "noi_dung", "phuong_an_a", "phuong_an_b", "phuong_an_c", "phuong_an_d", "dap_an_dung", "dap_an_tuong_duong", "loi_giai", "chu_de", "muc_do", "diem"];
const rows = [headers];
for (let n = 1; n <= 60; n += 1) {
  const kind = n <= 48 ? "DON" : n <= 54 ? "NHOM" : "NGAN";
  const group = n >= 49 && n <= 51 ? "N1" : n >= 52 && n <= 54 ? "N2" : "";
  const level = n <= 12 ? "BIET" : n <= 30 ? "HIEU" : "VANDUNG";
  rows.push([n, kind, group, "", "", "", "", "", "", "", "", "", level, n <= 40 ? 1.1667 : 1.1666]);
}
questions.getRange("A1:N61").values = rows;
styleTable(questions, "A1:N61", "A1:N1");
questions.getRange("A2:C61").format.fill = light;
questions.getRange("D2:N61").format.fill = amber;
questions.getRange("A1:N61").format.borders = { preset: "all", style: "thin", color: line };
questions.getRange("A2:A61").format.numberFormat = "0";
questions.getRange("N2:N61").format.numberFormat = "0.000000";
questions.getRange("A1:A61").format.columnWidth = 10;
questions.getRange("B1:C61").format.columnWidth = 13;
questions.getRange("D1:D61").format.columnWidth = 58;
questions.getRange("E1:H61").format.columnWidth = 34;
questions.getRange("I1:I61").format.columnWidth = 17;
questions.getRange("J1:J61").format.columnWidth = 34;
questions.getRange("K1:K61").format.columnWidth = 50;
questions.getRange("L1:L61").format.columnWidth = 28;
questions.getRange("M1:N61").format.columnWidth = 15;
questions.getRange("D2:M61").format.wrapText = true;
questions.getRange("A1:N1").format.rowHeight = 42;
questions.getRange("A2:N61").format.rowHeight = 36;
questions.getRange("B2:B61").dataValidation = { rule: { type: "list", values: ["DON", "NHOM", "NGAN"] } };
questions.getRange("M2:M61").dataValidation = { rule: { type: "list", values: ["BIET", "HIEU", "VANDUNG"] } };
questions.freezePanes.freezeRows(1);
questions.freezePanes.freezeColumns(3);

guide.getRange("A1:F1").merge();
guide.getRange("A1").values = [["HƯỚNG DẪN NHẬP ĐỀ CA4-1.0"]];
guide.getRange("A1:F1").format = { font: { name: font, size: 15, bold: true, color: navy }, rowHeight: 32 };
guide.getRange("A3:B10").values = [
  ["Mục", "Quy định"],
  ["Câu 01–48", "loai_cau = DON; đủ A–D; dap_an_dung là A, B, C hoặc D"],
  ["Câu 49–51", "loai_cau = NHOM; ma_nhom = N1; dùng tình huống N1"],
  ["Câu 52–54", "loai_cau = NHOM; ma_nhom = N2; dùng tình huống N2"],
  ["Câu 55–60", "loai_cau = NGAN; để trống A–D; nhập đáp án bằng chữ hoặc số"],
  ["Đáp án tương đương", "Ngăn cách các cách viết bằng ||"],
  ["Mức độ", "12 BIET, 18 HIEU, 30 VANDUNG"],
  ["Điểm", "Tổng cột diem của 60 câu phải bằng 70"],
];
styleTable(guide, "A3:B10", "A3:B3");
guide.getRange("A4:A10").format.fill = light;
guide.getRange("A4:A10").format.font = { name: font, size: 10, bold: true, color: "#173B67" };
guide.getRange("A1:A10").format.columnWidth = 26;
guide.getRange("B1:B10").format.columnWidth = 92;
guide.getRange("B4:B10").format.wrapText = true;
guide.getRange("A3:B10").format.rowHeight = 34;
guide.showGridLines = false;
guide.tabColor = "#8A99AA";
info.tabColor = navy;
passages.tabColor = "#E24B4B";
questions.tabColor = "#21885A";

workbook.recalculate();
await fs.mkdir("templates", { recursive: true });
await fs.mkdir("previews", { recursive: true });
for (const sheetName of ["THONG_TIN", "TINH_HUONG", "CAU_HOI", "HUONG_DAN"]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: sheetName === "CAU_HOI" ? 0.55 : 1, format: "png" });
  await fs.writeFile(`previews/${sheetName}.png`, new Uint8Array(await preview.arrayBuffer()));
}
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save("templates/CA4_mau_nhap_de.xlsx");
const check = await workbook.inspect({ kind: "table", range: "CAU_HOI!A1:N8", include: "values,formulas", tableMaxRows: 8, tableMaxCols: 14 });
console.log(check.ndjson);
