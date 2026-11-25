import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Tải kho.json mới nhất của tinhte-charts về làm bản dự phòng khi web không tải được từ GitHub.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const OWNER = 'pnghuy';
const REPO = 'tinhte-charts';
const BRANCH = 'main';
const KHO = 'kho.json';

async function run() {
  const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${KHO}`;
  console.log(`📡 Đang tải ${url} ...`);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GitHub phản hồi mã lỗi: ${res.status} ${res.statusText}`);
    const kho = await res.json();
    if (!kho || typeof kho.devices !== 'object') throw new Error('kho.json không có mục "devices"');

    // laptops.json (ngày test, link bài, màn hình, pin…) là tuỳ chọn
    const metaRes = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/laptops.json`);
    const meta = metaRes.ok ? await metaRes.json() : {};

    const targetPath = path.join(rootDir, 'data', 'kho-snapshot.js');
    const fileContent =
      `/* Bản dự phòng kho.json của ${OWNER}/${REPO}, dùng khi không tải được từ GitHub. Tạo bằng: npm run sync-data */\n` +
      `window.LAB = window.LAB || {};\n` +
      `LAB.KHO_SNAPSHOT = ${JSON.stringify(kho, null, 1)};\n` +
      `LAB.META_SNAPSHOT = ${JSON.stringify(meta, null, 1)};\n`;
    fs.writeFileSync(targetPath, fileContent, 'utf-8');
    console.log(`✅ ${Object.keys(kho.devices).length} máy, ${Object.keys(meta).length} mục thông tin → ${path.relative(rootDir, targetPath)}`);
  } catch (err) {
    console.error(`❌ Đồng bộ thất bại: ${err.message}`);
    process.exit(1);
  }
}

run();
