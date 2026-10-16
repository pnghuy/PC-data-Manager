/*
 * SCHEMA – cách phân loại & hiển thị dữ liệu.
 * ------------------------------------------------------------------
 * 1. Kết quả benchmark lấy TỰ ĐỘNG từ các file biểu đồ trong repo (data/...json).
 *    Bài test được xếp vào nhóm dựa theo tiêu đề biểu đồ (CATEGORIES bên dưới).
 *    Biểu đồ có đơn vị "FPS" tự vào nhóm "Chơi game thực tế".
 * 2. Cấu hình / màn hình / pin lấy từ file thông tin máy (laptops/<tên-thư-mục>.json).
 */
window.LAB = window.LAB || {};

// Nhóm bài test. "match" được so với tiêu đề biểu đồ đã bỏ dấu, viết thường, bỏ khoảng trắng.
LAB.CATEGORIES = [
  { id: 'cpu', title: 'Hiệu năng CPU', match: /cinebench|geekbench|r23|r26|blender|handbrake|7zip|corona|vray/ },
  { id: 'gpu', title: 'Hiệu năng đồ hoạ', match: /3dmark|timespy|firestrike|steelnomad|wildlife|portroyal|speedway|nightraid|solarbay|gfxbench/ },
  { id: 'games', title: 'Chơi game thực tế', match: /fps|cyberpunk|wukong|valorant|counterstrike|cs2|gta|eldenring|forza|leagueoflegends|dota|pubg|fortnite|apex|starfield|alanwake|hogwarts|reddead|tombraider|witcher/ },
  { id: 'system', title: 'Hiệu năng tổng thể', match: /pcmark|procyon|crossmark|speedometer|jetstream/ },
  { id: 'other', title: 'Bài test khác', match: null },
];

// Thông số cấu hình (từ file thông tin máy; CPU/GPU tự đoán từ tên trong biểu đồ nếu thiếu)
LAB.SPECS = [
  { key: 'cpu', label: 'CPU', type: 'text' },
  { key: 'gpu', label: 'GPU', type: 'text' },
  { key: 'gpu_tgp_w', label: 'TGP GPU', unit: 'W', noRank: true },
  { key: 'ram', label: 'RAM', type: 'text' },
  { key: 'storage', label: 'Ổ cứng', type: 'text' },
  { key: 'weight_kg', label: 'Khối lượng', unit: 'kg', decimals: 2, noRank: true },
  { key: 'os', label: 'Hệ điều hành', type: 'text' },
];

/*
 * Màn hình & pin – từ file thông tin máy:
 *   "display": { "size": 16, "brightness": 500, ... }  → cột display_size, display_brightness…
 *   "battery": { "wh": 90, "office": "7:10", ... }     → cột battery_wh, battery_office…
 */
LAB.STATIC_SECTIONS = [
  {
    id: 'display',
    title: 'Màn hình',
    groups: [
      {
        title: 'Thông số',
        metrics: [
          { key: 'display_size', label: 'Kích thước', unit: 'inch', decimals: 1, noRank: true },
          { key: 'display_resolution', label: 'Độ phân giải', type: 'text' },
          { key: 'display_refresh_hz', label: 'Tần số quét', unit: 'Hz', noRank: true },
          { key: 'display_panel', label: 'Tấm nền', type: 'text' },
        ],
      },
      {
        title: 'Kết quả đo',
        metrics: [
          { key: 'display_brightness', label: 'Độ sáng tối đa', unit: 'nits' },
          { key: 'display_srgb', label: 'Độ phủ sRGB', unit: '%' },
          { key: 'display_dcip3', label: 'Độ phủ DCI-P3', unit: '%' },
          { key: 'display_adobergb', label: 'Độ phủ AdobeRGB', unit: '%' },
          { key: 'display_deltae', label: 'Delta E trung bình', lowerBetter: true, decimals: 2 },
          { key: 'display_contrast', label: 'Độ tương phản', type: 'contrast' },
        ],
      },
    ],
  },
  {
    id: 'battery',
    title: 'Pin',
    groups: [
      {
        title: 'Thông số',
        metrics: [
          { key: 'battery_wh', label: 'Dung lượng pin', unit: 'Wh' },
          { key: 'battery_charger_w', label: 'Củ sạc kèm theo', unit: 'W', noRank: true },
        ],
      },
      {
        title: 'Thời lượng sử dụng',
        metrics: [
          { key: 'battery_office', label: 'Làm việc văn phòng', type: 'duration' },
          { key: 'battery_video', label: 'Xem video', type: 'duration' },
          { key: 'battery_gaming', label: 'Chơi game', type: 'duration' },
        ],
      },
    ],
  },
];

// Thứ tự các phần trên trang chi tiết
LAB.SECTION_ORDER = ['cpu', 'gpu', 'games', 'system', 'other', 'display', 'battery'];
