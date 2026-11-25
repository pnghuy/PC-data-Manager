/*
 * CẤU HÌNH WEBSITE
 * ------------------------------------------------------------------
 * Website đọc kho.json trực tiếp từ repo GitHub (không cần build lại web).
 * Chart Studio lưu máy mới vào kho.json là web tự cập nhật sau vài phút.
 */
window.LAB = window.LAB || {};

LAB.CONFIG = {
  siteName: 'Tinh tế Laptop Lab',

  github: {
    owner: 'pnghuy',
    repo: 'tinhte-charts',
    branch: 'main',
    // Kho máy dùng chung với Tinhte Chart Studio. Thêm/sửa máy ở Chart Studio là web tự cập nhật.
    khoFile: 'kho.json',
    // Thông tin thêm cho từng máy (ngày test, link bài, màn hình, pin…), khoá là id máy trong kho.json.
    metaFile: 'laptops.json',
  },

  // Bao lâu (phút) thì tải lại kho.json. File đọc qua raw.githubusercontent.com nên không bị
  // giới hạn 60 lượt/giờ của GitHub API.
  cacheMinutes: 10,

  // Số máy hiển thị mỗi lần ở trang chủ (bấm "Xem thêm" để tải tiếp)
  pageSize: 24,
};
