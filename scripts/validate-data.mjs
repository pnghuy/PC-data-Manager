import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 Bắt đầu kiểm tra tính toàn vẹn của dữ liệu máy tính (Data Validator)...\n');

let errorCount = 0;
let warningCount = 0;

function checkFile(relPath) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Thiếu file: ${relPath}`);
    errorCount++;
    return false;
  }
  return true;
}

// 1. Kiểm tra template metadata JSON
const metaTemplatePath = 'templates/sample-laptop-metadata.json';
if (checkFile(metaTemplatePath)) {
  try {
    const raw = fs.readFileSync(path.join(rootDir, metaTemplatePath), 'utf-8');
    const json = JSON.parse(raw);
    const requiredFields = ['name', 'brand', 'cpu', 'ram', 'storage', 'display', 'battery'];
    const missing = requiredFields.filter((f) => json[f] === undefined);
    if (missing.length > 0) {
      console.warn(`⚠️  Template metadata thiếu các trường khuyến nghị: ${missing.join(', ')}`);
      warningCount++;
    } else {
      console.log(`✅ File ${metaTemplatePath} hợp lệ (đầy đủ các trường chính)`);
    }
  } catch (err) {
    console.error(`❌ Lỗi phân tích cú pháp JSON trong ${metaTemplatePath}: ${err.message}`);
    errorCount++;
  }
}

// 2. Kiểm tra template CSV
const csvFiles = ['templates/laptops.csv', 'templates/games.csv'];
for (const csv of csvFiles) {
  if (checkFile(csv)) {
    const content = fs.readFileSync(path.join(rootDir, csv), 'utf-8');
    const lines = content.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length <= 1) {
      console.warn(`⚠️  File ${csv} chỉ có tiêu đề, chưa có dữ liệu mẫu`);
      warningCount++;
    } else {
      console.log(`✅ File ${csv} hợp lệ (${lines.length - 1} dòng dữ liệu)`);
    }
  }
}

// 3. Kiểm tra bản dự phòng kho.json (data/kho-snapshot.js)
const snapshotPath = 'data/kho-snapshot.js';
if (checkFile(snapshotPath)) {
  try {
    const code = fs.readFileSync(path.join(rootDir, snapshotPath), 'utf-8');
    const match = code.match(/LAB\.KHO_SNAPSHOT\s*=\s*(\{[\s\S]*\});?\s*$/);
    if (!match) throw new Error('không tìm thấy LAB.KHO_SNAPSHOT');
    const kho = JSON.parse(match[1]);

    // Id bài test chuẩn lấy từ js/schema.js
    const schema = fs.readFileSync(path.join(rootDir, 'js/schema.js'), 'utf-8');
    const known = new Set([...schema.matchAll(/T\('([a-z0-9-]+)'/g)].map((m) => m[1]));
    Object.keys(kho.tests || {}).forEach((id) => known.add(id));
    const seriesLen = (id) => {
      const custom = kho.tests && kho.tests[id];
      if (custom) return Array.isArray(custom.series) ? custom.series.length : 1;
      return new RegExp("T\\('" + id + "'[^\\n]*series: S2").test(schema) ? 2 : 1;
    };

    const devices = Object.entries(kho.devices || {});
    let bad = 0;
    for (const [id, d] of devices) {
      for (const [tid, vals] of Object.entries(d.scores || {})) {
        if (!known.has(tid)) {
          console.warn(`⚠️  ${id}: bài test "${tid}" chưa có trong js/schema.js hoặc kho.tests`);
          warningCount++; bad++;
        } else if (!Array.isArray(vals) || vals.length !== seriesLen(tid)) {
          console.warn(`⚠️  ${id}: điểm "${tid}" cần ${seriesLen(tid)} số`);
          warningCount++; bad++;
        }
      }
    }
    const measured = devices.filter(([, d]) => d.measured).length;
    console.log(`✅ ${snapshotPath}: ${devices.length} máy (${measured} máy Tinh tế đo), ${bad} điểm có vấn đề`);
  } catch (err) {
    console.error(`❌ Lỗi kiểm tra ${snapshotPath}: ${err.message}`);
    errorCount++;
  }
}

console.log('\n----------------------------------------');
if (errorCount === 0) {
  console.log(`🎉 Kiểm tra hoàn tất thành công! (${warningCount} cảnh báo)`);
  process.exit(0);
} else {
  console.error(`💥 Phát hiện ${errorCount} lỗi cần xử lý! (${warningCount} cảnh báo)`);
  process.exit(1);
}
