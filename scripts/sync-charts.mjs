import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const OWNER = 'pnghuy';
const REPO = 'tinhte-charts';
const BRANCH = 'main';
const DATA_DIR = 'data';

console.log(`📡 Đang chuẩn bị đồng bộ dữ liệu benchmark từ ${OWNER}/${REPO} (${BRANCH})...`);

const token = process.env.GITHUB_TOKEN;
const headers = {
  'User-Agent': 'PC-Data-Manager-Sync-Script',
  Accept: 'application/vnd.github.v3+json',
};
if (token) {
  headers['Authorization'] = `token ${token}`;
}

async function run() {
  try {
    const treeUrl = `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`;
    console.log(`🔍 Truy vấn cây thư mục: ${treeUrl}`);
    const res = await fetch(treeUrl, { headers });

    if (!res.ok) {
      throw new Error(`GitHub API phản hồi mã lỗi: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const jsonFiles = (data.tree || []).filter(
      (item) =>
        item.type === 'blob' &&
        item.path.startsWith(`${DATA_DIR}/`) &&
        item.path.endsWith('.json')
    );

    console.log(`📦 Tìm thấy ${jsonFiles.length} file biểu đồ JSON.`);

    const snapshot = {};
    for (const file of jsonFiles) {
      const rawUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${file.path}`;
      const fileRes = await fetch(rawUrl);
      if (fileRes.ok) {
        const jsonContent = await fileRes.json();
        snapshot[file.path] = jsonContent;
      } else {
        console.warn(`⚠️ Không tải được ${file.path}`);
      }
    }

    const targetPath = path.join(rootDir, 'data', 'github-snapshot.js');
    const fileContent = `/* Snapshot of ${OWNER}/${REPO} data files for offline / instant loading */\n/* Generated at ${new Date().toISOString()} */\nwindow.LAB = window.LAB || {};\nLAB.GITHUB_SNAPSHOT = ${JSON.stringify(snapshot, null, 2)};\n`;

    fs.writeFileSync(targetPath, fileContent, 'utf-8');
    console.log(`✅ Đã cập nhật thành công snapshot vào: ${targetPath}`);
  } catch (err) {
    console.error(`❌ Đồng bộ thất bại: ${err.message}`);
    process.exit(1);
  }
}

run();
