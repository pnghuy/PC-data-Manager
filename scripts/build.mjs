import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

console.log('📦 Bắt đầu đóng gói tĩnh dự án vào dist/...\n');

// 1. Dọn dẹp thư mục dist
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// 2. Danh sách thư mục & file cần copy
const itemsToCopy = ['index.html', 'assets', 'js', 'data', 'templates', 'README.md'];

let fileCount = 0;

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
    fileCount++;
  }
}

for (const item of itemsToCopy) {
  const srcPath = path.join(rootDir, item);
  const destPath = path.join(distDir, item);
  if (fs.existsSync(srcPath)) {
    copyRecursive(srcPath, destPath);
    console.log(`  ✓ Đã copy: ${item}`);
  }
}

console.log(`\n🎉 Build hoàn tất! Đã xuất ${fileCount} file vào thư mục dist/.`);
console.log('   Bạn có thể deploy thư mục dist/ trực tiếp lên Cloudflare Pages, Vercel hoặc GitHub Pages.');
