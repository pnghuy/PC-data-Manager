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

// 3. Kiểm tra file snapshot dữ liệu offline
const snapshotPath = 'data/github-snapshot.js';
if (checkFile(snapshotPath)) {
  try {
    const code = fs.readFileSync(path.join(rootDir, snapshotPath), 'utf-8');
    const match = code.match(/LAB\.GITHUB_SNAPSHOT\s*=\s*(\{[\s\S]*\});?\s*$/);
    if (!match) {
      console.error(`❌ Không trích xuất được object LAB.GITHUB_SNAPSHOT trong ${snapshotPath}`);
      errorCount++;
    } else {
      const snapshot = JSON.parse(match[1]);
      const fileKeys = Object.keys(snapshot);
      console.log(`✅ File ${snapshotPath} hợp lệ với ${fileKeys.length} biểu đồ test`);

      // Kiểm tra tính hợp lệ của từng bài test trong snapshot
      let validCharts = 0;
      let missingHighlight = 0;
      for (const key of fileKeys) {
        const chart = snapshot[key];
        if (!chart.title || !Array.isArray(chart.items) || chart.items.length === 0) {
          console.warn(`⚠️  Biểu đồ ${key} thiếu tiêu đề hoặc không có items`);
          warningCount++;
          continue;
        }
        const hasHighlight = chart.items.some((item) => item.highlight === true);
        if (!hasHighlight) {
          missingHighlight++;
        }
        validCharts++;
      }

      if (missingHighlight > 0) {
        console.warn(`⚠️  Có ${missingHighlight} biểu đồ chưa đánh dấu máy đang review ("highlight": true)`);
        warningCount++;
      }
      console.log(`📊 Tổng hợp biểu đồ: ${validCharts} hợp lệ / ${fileKeys.length} file`);
    }
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
