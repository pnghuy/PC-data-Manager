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
5. **So sánh nhiều máy** (`#/so-sanh?m=id1,id2`): bấm "+ So sánh" dưới thẻ máy hoặc trên trang máy, chọn 2–4 máy rồi bấm "So sánh" ở thanh dưới màn hình. Trang so sánh có bảng thông số (đánh dấu máy tốt nhất) và biểu đồ từng bài test, kèm % chênh lệch với máy tốt nhất. Link so sánh chia sẻ được.
6. **Tab cho bài cùng họ**: Cinebench 2026/2024/R23, Geekbench 7/6, 3DMark Time Spy, Fire Strike, Steel Nomad gộp chung một khung có tab khi máy có từ 2 phiên bản trở lên.
7. **Tải ảnh PNG**: nút "Tải ảnh" trên mỗi biểu đồ xuất ảnh nền trắng màu Tinh tế, đúng các dòng đang hiện (bấm "Xem tất cả" trước nếu muốn đủ máy).
8. **Kiểm tra dữ liệu**: mở `#/?debug=1` để xem nguồn đang dùng, nút tải lại và các "lưu ý dữ liệu" (sai số cột, bài test chưa khai báo).

---

## 5. Hướng dẫn Deploy & Gắn Tên Miền

Toàn bộ project là web tĩnh (HTML/CSS/JS thuần, không cần máy chủ Node.js). Lệnh `npm run build` đóng gói đủ `index.html`, `assets/`, `js/`, `data/` vào thư mục `dist/`.

Kiểm tra nhanh bản build trên máy trước khi deploy:

```bash
npm run build
npm run preview    # mở thử bản dist/ tại http://localhost:4173
```

### Cách 1: Cloudflare Pages (Khuyên dùng – nhanh, tự động deploy khi merge `main`)
1. Đăng nhập [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → chọn thẻ **Pages** → **Connect to Git**.
2. Chọn repo `pnghuy/PC-data-Manager`, nhánh production: `main`.
3. Cấu hình build:
   - **Framework preset**: `None`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Bấm **Save and Deploy**. Mỗi lần merge PR vào `main`, Cloudflare tự build lại và phát hành.
5. Gắn tên miền riêng: vào **Custom domains** → **Set up a custom domain** (ví dụ `laptop.tinhte.vn` hoặc `lab.tinhte.vn`). Nếu DNS đã nằm trên Cloudflare, bản ghi CNAME và chứng chỉ HTTPS sẽ được cấp tự động.

### Cách 2: GitHub Pages (đã có sẵn workflow)
Repo đã có sẵn workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) tự chạy `npm run lint`, `npm run validate`, `npm run build` rồi deploy thư mục `dist/` mỗi khi có commit mới trên `main`.

1. Mở repo trên GitHub → **Settings** → **Pages**.
2. Ở mục **Build and deployment → Source**, chọn **GitHub Actions**.
3. Đợi workflow **Deploy GitHub Pages** chạy xong (hoặc bấm **Run workflow** trong tab **Actions** để chạy ngay).
4. (Tuỳ chọn) Gắn tên miền riêng ở mục **Custom domain**, sau đó trỏ bản ghi `CNAME` của tên miền về `pnghuy.github.io` và bật **Enforce HTTPS**.

> Lưu ý: Web dùng đường dẫn tương đối và hash URL (`#/`, `#/may/<id>`, `#/so-sanh`), nên chạy được cả ở tên miền gốc (`https://laptop.tinhte.vn/`) lẫn thư mục con (`https://pnghuy.github.io/PC-data-Manager/`).

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
│   ├── export.js               # Xuất biểu đồ ra ảnh PNG bằng canvas
│   └── app.js                  # Bộ định tuyến hash URL, tìm kiếm, lọc, so sánh nhiều máy, render biểu đồ
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

