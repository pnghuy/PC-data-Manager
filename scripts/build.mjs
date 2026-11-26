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

// 2. Danh sách thư mục & file cần copy cho bản deploy public
const itemsToCopy = ['index.html', 'assets', 'js', 'data'];

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
  } else {
    console.error(`❌ Không tìm thấy nguồn bắt buộc: ${item}`);
    process.exit(1);
  }
}

// 3. Tạo file .nojekyll để GitHub Pages phục vụ trực tiếp file tĩnh
fs.writeFileSync(path.join(distDir, '.nojekyll'), '');

// 4. Kiểm tra đủ các file bắt buộc trong dist/
const requiredOutputs = [
  'index.html',
  'assets/style.css',
  'js/config.js',
  'js/schema.js',
  'js/data.js',
  'js/export.js',
  'js/i18n.js',
  'js/app.js',
  'data/kho-snapshot.js',
];

const missingOutputs = requiredOutputs.filter(
  (relPath) => !fs.existsSync(path.join(distDir, relPath)),
);

if (missingOutputs.length > 0) {
  console.error(`\n❌ Thiếu file bắt buộc trong dist/: ${missingOutputs.join(', ')}`);
  process.exit(1);
}

console.log(`\n🎉 Build hoàn tất! Đã xuất ${fileCount} file vào thư mục dist/.`);
console.log('   Chạy `npm run preview` để xem thử bản dist/ trước khi deploy.');
