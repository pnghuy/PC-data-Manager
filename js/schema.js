/*
 * SCHEMA – cách phân loại & hiển thị dữ liệu.
 * ------------------------------------------------------------------
 * 1. Kết quả benchmark lấy từ kho.json của repo tinhte-charts, theo id bài test (TESTS bên dưới).
 *    Bài test riêng (game, AI…) khai báo trong mục "tests" của kho.json.
 *    Bài test được xếp vào nhóm dựa theo tiêu đề (CATEGORIES). Đơn vị "FPS" tự vào nhóm game.
 * 2. Cấu hình / màn hình / pin / ngày test / link bài: từ laptops.json của repo tinhte-charts.
 */
window.LAB = window.LAB || {};

// Nhóm bài test. "match" được so với tiêu đề biểu đồ đã bỏ dấu, viết thường, bỏ khoảng trắng.
LAB.CATEGORIES = [
  { id: 'cpu', title: 'Hiệu năng CPU', match: /cinebench|geekbench|r23|r26|blender|handbrake|7zip|corona|vray/ },
  { id: 'gpu', title: 'Hiệu năng đồ hoạ', match: /3dmark|timespy|firestrike|steelnomad|wildlife|portroyal|speedway|nightraid|solarbay|gfxbench/ },
  { id: 'games', title: 'Chơi game thực tế', match: /fps|cyberpunk|wukong|valorant|counterstrike|cs2|gta|eldenring|forza|leagueoflegends|dota|pubg|fortnite|apex|starfield|alanwake|hogwarts|reddead|tombraider|witcher/ },
  { id: 'system', title: 'Hiệu năng tổng thể & pin', match: /pcmark|procyon|crossmark|speedometer|jetstream/ },
  { id: 'ai', title: 'AI chạy cục bộ', match: /ailocal|llm|tokens?/ },
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
  { key: 'price', label: 'Giá tham khảo', type: 'text' },
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
          { key: 'battery_charge_time', label: 'Sạc 0 → 100%', type: 'duration', lowerBetter: true },
        ],
      },
    ],
  },
];

// Thứ tự các phần trên trang chi tiết
LAB.SECTION_ORDER = ['cpu', 'gpu', 'games', 'ai', 'system', 'other', 'display', 'battery'];

/*
 * Danh mục bài test chuẩn – trùng id với Tinhte Chart Studio (core.js → TESTS).
 * cat: 'cpu' thì biểu đồ ghi tên CPU, 'gpu' thì ghi tên GPU (máy chỉ có iGPU ghi tên iGPU).
 * Thêm bài mới ở Chart Studio thì thêm vào đây cùng id.
 */
(function () {
  const S2 = ['Đơn nhân', 'Đa nhân'];
  const HI = 'Điểm càng cao càng tốt';
  const T = (id, title, cat, o) => Object.assign({ id, title, cat, series: null, unit: 'điểm', sub: HI }, o || {});
  LAB.TESTS = [
    T('3dmark-time-spy', '3DMark Time Spy', 'gpu'),
    T('3dmark-time-spy-extreme', '3DMark Time Spy Extreme', 'gpu'),
    T('3dmark-fire-strike', '3DMark Fire Strike', 'gpu'),
    T('3dmark-fire-strike-extreme', '3DMark Fire Strike Extreme', 'gpu'),
    T('3dmark-fire-strike-ultra', '3DMark Fire Strike Ultra', 'gpu'),
    T('3dmark-steel-nomad', '3DMark Steel Nomad', 'gpu'),
    T('3dmark-steel-nomad-light', '3DMark Steel Nomad Light', 'gpu'),
    T('3dmark-port-royal', '3DMark Port Royal', 'gpu'),
    T('3dmark-speed-way', '3DMark Speed Way', 'gpu'),
    T('3dmark-solar-bay', '3DMark Solar Bay', 'gpu'),
    T('3dmark-wild-life-extreme', '3DMark Wild Life Extreme', 'gpu'),
    T('cinebench-2026', 'Cinebench 2026', 'cpu', { series: S2 }),
    T('cinebench-r23', 'Cinebench R23', 'cpu', { series: S2 }),
    T('cinebench-2024', 'Cinebench 2024', 'cpu', { series: S2 }),
    T('geekbench-7', 'Geekbench 7', 'cpu', { series: S2 }),
    T('geekbench-6', 'Geekbench 6', 'cpu', { series: S2 }),
    T('procyon-office', 'Procyon Office Productivity', 'cpu'),
    T('procyon-photo', 'Procyon Photo Editing', 'cpu'),
    T('procyon-video', 'Procyon Video Editing', 'cpu'),
    T('procyon-battery', 'Procyon Battery Life', 'cpu', { unit: 'phút', sub: 'Thời gian sáng màn hình (phút), càng lâu càng tốt' }),
    T('pcmark-10', 'PCMark 10', 'cpu'),
  ];
})();
