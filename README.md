# Tinh tế Laptop Lab – Hệ thống tra cứu kết quả test Laptop

Hệ thống tra cứu kết quả benchmark, hiệu năng CPU, GPU, màn hình, pin và FPS game thực tế của các mẫu laptop do Tinh tế đánh giá. Tương tự như laplap.tech nhưng được tối ưu riêng cho nhu cầu của Tinh tế.

Website hoạt động theo mô hình **Zero-Backend (Serverless)**:
- **Nguồn dữ liệu**: một file duy nhất, [`kho.json`](https://github.com/pnghuy/tinhte-charts/blob/main/kho.json) ở gốc repo `pnghuy/tinhte-charts`. Đây cũng là kho máy mà Tinhte Chart Studio đọc và ghi.
- **Tự động cập nhật**: lưu máy mới trong Chart Studio là `kho.json` đổi, web tự hiện máy đó sau vài phút, không cần build lại.
- **Dự phòng**: nếu không tải được từ GitHub, web thử jsDelivr, rồi bản đệm trong trình duyệt, rồi bản `data/kho-snapshot.js` đi kèm.
- **Hosting**: web tĩnh, deploy miễn phí trên Cloudflare Pages, Vercel hoặc GitHub Pages.

---

> **Làm luân phiên Claude ↔ Antigravity:** đọc [`AGENTS.md`](AGENTS.md) (luật chung) và [`HANDOFF.md`](HANDOFF.md) (trạng thái, việc tiếp theo, quy trình) trước khi làm.

## 1. Chạy thử trên máy

```bash
npm install
npm run dev        # http://localhost:3000
```

Hoặc `npm run serve` nếu chưa cài package.

---

## 2. Dữ liệu lấy từ đâu

Mỗi mục trong `devices` của `kho.json` là một máy:

```json
"acer-nitro-propanel-anv16-core-5-205h-rtx-3050-65w-laptop": {
  "name": "Acer Nitro ProPanel ANV16",
  "cpu": "Core 5 205H",
  "gpu": "RTX 3050 65W",
  "type": "laptop",
  "measured": true,
  "scores": { "cinebench-2024": [108, 580], "3dmark-time-spy": [5020] }
}
```

Web xử lý như sau:
1. **Thẻ máy trên trang chủ**: các laptop/PC có `"measured": true` (Tinh tế tự đo) và có tên máy thật. Dòng chỉ ghi tên chip (`chipOnly`) không thành thẻ.
2. **Biểu đồ so sánh**: mỗi bài test của máy được so với mọi máy cùng loại có cùng bài test trong kho (laptop/PC không lẫn với card đồ họa rời). Tên hiển thị theo quy tắc của Chart Studio: bài CPU ghi tên CPU, bài đồ họa ghi tên GPU.
3. **Số tham khảo** (`"measured": false`) chỉ xuất hiện trong biểu đồ, có nhãn "tham khảo" và không tính vào thứ hạng. Dòng tham khảo trùng tên và chip với một máy đã đo thì được gộp vào trang của máy đó.
4. **Bài test**: id chuẩn nằm trong `LAB.TESTS` ở `js/schema.js` (trùng với Chart Studio). Bài riêng (game, AI…) khai báo trong mục `tests` của `kho.json`.

Web không đọc các file chart trong `data/` của tinhte-charts nữa. Lý do: tên máy trong chart có thể được sửa riêng cho từng bài (ví dụ bài tài trợ chỉ ghi tên chip), còn `kho.json` luôn giữ tên đầy đủ.

---

## 3. Thông tin thêm cho từng máy (`laptops.json`)

Ngày test, link bài review, ảnh, RAM, màn hình, pin… không nằm trong `kho.json` mà trong file `laptops.json` cùng ở gốc repo `tinhte-charts`. Khoá là id máy trong `kho.json`, chỉ cần điền những gì đã có:

```json
{
  "acer-nitro-propanel-anv16-core-5-205h-rtx-3050-65w-laptop": {
    "test_date": "2026-11",
    "review_url": "https://tinhte.vn/thread/...",
    "image_url": "https://photo2.tinhte.vn/...",
    "ram": "16GB",
    "display": { "size": 16, "refresh_hz": 180, "brightness": 400, "srgb": 100 },
    "battery": { "wh": 57, "office": 420, "video": "8:15" }
  }
}
```

- Đủ các trường xem ở [`templates/sample-laptop-metadata.json`](templates/sample-laptop-metadata.json).
- `test_date` ghi `YYYY-MM` hoặc `YYYY-MM-DD`; dùng để sắp xếp "Mới test nhất".
- Thời lượng pin ghi số phút (`420`) hoặc `"7:00"`, `"7g00p"` đều được.
- `"hidden": true`: ẩn thẻ máy. `"show": true`: hiện thẻ cho máy chỉ có số tham khảo (ví dụ ASUS ProArt P16), trang máy sẽ ghi rõ "Số tham khảo".
- Không có `laptops.json` thì web vẫn chạy, chỉ thiếu các thông tin này.

---

## 4. Các tính năng nổi bật của Website

1. **Tìm kiếm tức thì (Instant Search)**: Tìm theo tên máy, thương hiệu (ASUS, Lenovo, Dell, Acer, Apple...), tên CPU (Ultra 9, Ryzen 9, Snapdragon X...), GPU (RTX 5090, 4080...).
2. **Bộ lọc theo danh mục test (Category Chips)**:
   - Tất cả máy
   - Hiệu năng CPU (Cinebench, Geekbench...)
   - Đồ hoạ 3DMark (Time Spy, Fire Strike, Steel Nomad...)
   - Chơi game thực tế (FPS Cyberpunk, Black Myth Wukong...)
   - Hiệu năng tổng thể (PCMark 10, UL Procyon...)
3. **Sắp xếp linh hoạt**: Sắp xếp theo ngày test mới nhất, số lượng bài test, hoặc xếp hạng theo điểm số của từng bài test cụ thể.
4. **Biểu đồ so sánh trực quan**:
   - Thang đo điểm số chuẩn xác (chuẩn hóa giá trị cao nhất/thấp nhất).
   - Máy đang xem được highlight phát sáng với huy hiệu `[MÁY ĐANG XEM]`.
   - Thứ hạng trong số các máy Tinh tế tự đo: `Hạng #2 / 16 máy Tinh tế đo`.
   - Mặc định hiện 7 máy quanh máy đang xem, bấm "Xem tất cả" để mở hết.
5. **Kiểm tra dữ liệu**: điểm sai số cột hoặc bài test chưa khai báo trong kho được liệt kê ở nút "lưu ý dữ liệu" trên thanh nguồn.

---

## 5. Hướng dẫn Deploy & Gán Tên Miền Tinh tế

Toàn bộ project là mã nguồn web tĩnh (HTML/CSS/Vanilla JS thuần, không cần npm build, không cần máy chủ Node.js):

### Cách 1: Cloudflare Pages (Khuyên dùng nhất – Cực nhanh & Ổn định)
1. Đăng nhập [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Chọn **Workers & Pages** > **Create application** > chọn thẻ **Pages**.
3. Chọn **Upload assets**: Kéo thả toàn bộ thư mục `tinhte-laptop-lab` lên.
4. Bấm **Deploy**.
5. Trong cài đặt Pages > mục **Custom domains**, bấm thêm tên miền (ví dụ: `laptop.tinhte.vn` hoặc `lab.tinhte.vn`). Cloudflare sẽ tự động cấp chứng chỉ bảo mật SSL HTTPS miễn phí.

### Cách 2: GitHub Pages
1. Tạo một repository mới trên GitHub (ví dụ: `tinhte-laptop-lab`).
2. Đẩy toàn bộ thư mục này lên repo.
3. Vào tab **Settings** > **Pages** > Chọn Source là branch `main` và thư mục `/ (root)`.
4. Điền Custom Domain nếu muốn trỏ subdomain Tinh tế.

### Cách 3: Vercel
1. Đăng nhập [vercel.com](https://vercel.com).
2. Tạo project mới bằng cách import thư mục hoặc gõ lệnh `vercel deploy`.
3. Gán Custom Domain trong phần Settings > Domains.

---

## 6. Cấu trúc thư mục mã nguồn

```text
tinhte-laptop-lab/
├── index.html                  # Khung HTML chính chuẩn SEO & Responsive
├── assets/
│   └── style.css               # Giao diện Dark/Light mode chuẩn Tinh tế, tối ưu Mobile
├── js/
│   ├── config.js               # Cấu hình repo GitHub (owner, repo, branch, file kho)
│   ├── schema.js               # Danh mục bài test (id trùng Chart Studio) và nhóm hiển thị
│   ├── data.js                 # Tải kho.json (GitHub → jsDelivr → cache → snapshot), dựng biểu đồ so sánh
│   └── app.js                  # Bộ định tuyến hash URL, tìm kiếm, lọc, render biểu đồ
├── data/
│   └── kho-snapshot.js         # Bản dự phòng kho.json (npm run sync-data)
├── templates/
│   ├── sample-laptop-metadata.json   # File mẫu cấu hình máy, màn hình, pin
│   ├── laptops.csv             # Template tham khảo
│   └── games.csv               # Template tham khảo
└── README.md                   # Tài liệu hướng dẫn sử dụng
```

---

## 7. Lệnh npm & Môi trường phát triển cục bộ

Cài đặt thư viện môi trường:
```bash
npm install
```

Các lệnh chính được cấu hình sẵn:
- `npm run dev` hoặc `npm start`: Khởi động máy chủ dev Vite tốc độ cao kèm live-reload tại `http://localhost:3000`.
- `npm run serve`: Chạy máy chủ tĩnh Node.js thuần (zero-dependency, chạy được ngay cả khi chưa tải package).
- `npm run validate`: Kiểm tra bản dự phòng kho.json (id bài test, số cột điểm) và các file mẫu.
- `npm run build`: Đóng gói toàn bộ web tĩnh và dữ liệu vào thư mục `dist/` để sẵn sàng deploy.
- `npm run sync-data`: Tải `kho.json` mới nhất về `data/kho-snapshot.js`.
- `npm run lint`: Kiểm tra chuẩn code JavaScript với ESLint flat config.
- `npm run format`: Tự động định dạng code bằng Prettier.

