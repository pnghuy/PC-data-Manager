/*
 * CẤU HÌNH WEBSITE
 * ------------------------------------------------------------------
 * Website đọc dữ liệu trực tiếp từ repo GitHub (không cần build lại web).
 * Cứ commit file JSON mới vào repo là web tự cập nhật sau vài phút.
 */
window.LAB = window.LAB || {};

LAB.CONFIG = {
  siteName: 'Tinh tế Laptop Lab',

  github: {
    owner: 'pnghuy',
    repo: 'tinhte-charts',
    branch: 'main',
    // Thư mục chứa các file biểu đồ benchmark. Mỗi thư mục con = 1 máy đã test.
    dataDir: 'data',
    // Thư mục chứa file thông tin máy (tên chuẩn, CPU/GPU, màn hình, pin, link review…).
    // Tên file phải trùng tên thư mục trong data/, ví dụ: laptops/2026-07-zephyrus-duo.json
    // Để NGOÀI thư mục data/ để workflow render video không xử lý nhầm.
    metaDir: 'laptops',
  },

  // Bao lâu (phút) thì hỏi lại GitHub xem repo có gì mới.
  // GitHub giới hạn 60 lượt/giờ cho mỗi địa chỉ IP nên đừng để quá thấp.
  cacheMinutes: 10,

  // Gộp các tên bài test khác nhau nhưng thực chất là một.
  // Ví dụ: { 'Cinebench R26': 'Cinebench 2026' }
  // (So khớp không phân biệt hoa thường, dấu cách, dấu gạch.)
  testAliases: {},

  // Số máy hiển thị mỗi lần ở trang chủ (bấm "Xem thêm" để tải tiếp)
  pageSize: 24,
};
