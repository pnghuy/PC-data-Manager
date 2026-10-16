# Tinh tế Laptop Lab – Hệ thống tra cứu kết quả test Laptop

Hệ thống tra cứu kết quả benchmark, hiệu năng CPU, GPU, màn hình, pin và FPS game thực tế của các mẫu laptop do Tinh tế đánh giá. Tương tự như laplap.tech nhưng được tối ưu riêng cho nhu cầu của Tinh tế.

Website hoạt động theo mô hình **Zero-Backend (Serverless)**:
- **Nguồn dữ liệu**: Đọc trực tiếp từ kho lưu trữ GitHub của Tinh tế: [`pnghuy/tinhte-charts`](https://github.com/pnghuy/tinhte-charts).
- **Tự động cập nhật**: Mỗi khi reviewer push commit hoặc tạo thư mục bài test JSON mới trong `data/`, website sẽ tự phát hiện và hiển thị kết quả ngay, không cần cấu hình database hay build lại frontend.
- **Offline / Local First**: Hỗ trợ mở trực tiếp file `index.html` trong máy tính mà không sợ lỗi CORS nhờ bộ đệm thông minh, cache `localStorage`, và fallback jsDelivr CDN.
- **Hosting**: Triển khai miễn phí trọn đời trên Cloudflare Pages, Vercel hoặc GitHub Pages, dễ dàng gán tên miền riêng (ví dụ: `laptop.tinhte.vn` hoặc `lab.tinhte.vn`).

---

## 1. Trải nghiệm nhanh trên máy tính
Bạn chỉ cần mở trực tiếp file `index.html` bằng bất kỳ trình duyệt nào (Chrome, Edge, Firefox, Safari) mà không cần cài thêm công cụ gì:
- Đường dẫn: `C:\Users\Tinhte\.gemini\antigravity\scratch\tinhte-laptop-lab\index.html`
- Website tự động đồng bộ từ repo GitHub `pnghuy/tinhte-charts` hoặc nạp snapshot đi kèm nếu không có mạng.

---

## 2. Cách dữ liệu được tổ chức trong repo GitHub

Trong repo `pnghuy/tinhte-charts`, website đọc dữ liệu từ 2 thư mục:

```text
pnghuy/tinhte-charts/
├── data/                                 # Chứa các bài test benchmark
│   ├── 2026-07-zephyrus-duo/             # Mỗi thư mục = 1 máy được đánh giá
│   │   ├── Cinebench-2026.json           # Biểu đồ Cinebench
│   │   ├── Geekbench6.json               # Biểu đồ Geekbench
│   │   ├── 3DMark-TimeSpy.json           # Biểu đồ 3DMark Time Spy
│   │   └── PCMark10.json                 # Biểu đồ PCMark
│   └── 2026-07-rog-strix-scar-18/
│       ├── Cinebench 2024-...json
│       └── ...
└── laptops/                              # (Tuỳ chọn) Chứa thông số chi tiết của máy
    ├── 2026-07-zephyrus-duo.json         # Tên file trùng tên thư mục trong data/
    └── 2026-07-rog-strix-scar-18.json
```

### Quy tắc nhận diện tự động trong `data/`:
1. **Thư mục con**: Tên thư mục quy định mã định danh của máy (vd: `2026-07-zephyrus-duo`). Tiền tố `YYYY-MM` sẽ được tự động nhận diện thành thời gian test.
2. **File biểu đồ JSON**: Mỗi file JSON là một bài test so sánh.
3. **Máy được đánh giá**: Trong mảng `items`, phần tử có `"highlight": true` chính là chiếc laptop đang được review. Website tự động:
   - Trích xuất điểm số của máy này để đưa vào danh mục và xếp hạng.
   - Nhận diện phần cứng CPU, GPU từ chuỗi tên trong ngoặc (ví dụ: `Zephyrus DUO (Ultra 9 386H)` → CPU: `Ultra 9 386H`).
4. **Các máy so sánh**: Tất cả các phần tử khác trong `items` được giữ nguyên để vẽ biểu đồ thanh (bar chart) so sánh trực quan trong trang chi tiết của máy.
5. **Đa series**: Hỗ trợ đầy đủ các bài test có nhiều cột dữ liệu như Cinebench (Single-core & Multi-core) hoặc Geekbench (Cắm sạc & Chạy pin).

---

## 3. Cách thêm thông tin chi tiết (Màn hình, Pin, Link bài Tinh tế)

Các công cụ render biểu đồ video của bạn chỉ cần thư mục `data/`. Để bổ sung thêm thông số chuyên sâu (màn hình, thời lượng pin, RAM, cân nặng, ảnh đại diện, link bài review Tinh tế) mà **không làm ảnh hưởng** đến script render video:

Bạn chỉ cần tạo thêm thư mục `laptops/` ở ngoài gốc repo, và tạo file JSON trùng tên với thư mục trong `data/`:
Ví dụ: `laptops/2026-07-zephyrus-duo.json`

Xem mẫu cấu trúc đầy đủ tại: [`templates/sample-laptop-metadata.json`](templates/sample-laptop-metadata.json):

```json
{
  "name": "ASUS ROG Zephyrus Duo 16",
  "brand": "ASUS",
  "tester": "Huy Nguyễn",
  "review_url": "https://tinhte.vn/thread/danh-gia-asus-rog-zephyrus-duo-16.3700000/",
  "image_url": "https://photo2.tinhte.vn/data/attachment-files/2026/07/laptop.jpg",
  "cpu": "AMD Ryzen 9 7945HX",
  "gpu": "RTX 4090 175W",
  "ram": "32GB DDR5",
  "storage": "2TB NVMe PCIe 4.0",
  "weight_kg": 2.67,
  "display": {
    "size": 16.0,
    "resolution": "2560 x 1600 (QHD+)",
    "refresh_hz": 240,
    "panel": "Mini-LED",
    "brightness": 1100,
    "srgb": 100,
    "dcip3": 100,
    "deltae": 0.85
  },
  "battery": {
    "wh": 90,
    "charger_w": 330,
    "office": "6g 30p",
    "video": "8g 15p",
    "gaming": "1g 40p"
  }
}
```

*Nếu không có file `laptops/<id>.json`, website vẫn tự hoạt động 100% bình thường bằng cách lấy tên máy và CPU/GPU từ các file JSON trong `data/`.*

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
   - Hiển thị thứ hạng toàn hệ thống: `Hạng #1 / 4 máy`, `Hạng #2 / 5 máy`.
   - Nút liên kết trực tiếp tới file JSON gốc trên GitHub của từng bài test.
5. **Cơ chế kiểm soát chất lượng dữ liệu (Data Quality Inspector)**:
   - Tự động phát hiện nếu có 2 máy trùng tên trong 1 biểu đồ.
   - Phát hiện nếu tên file và tiêu đề bài test bị vênh nhau.
   - Phát hiện biểu đồ thiếu máy `highlight: true` hoặc số liệu bị copy nhầm.
   - Hiển thị nút cảnh báo nhẹ nhàng trên thanh công cụ để reviewer dễ kiểm tra và tinh chỉnh repo.

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
│   ├── config.js               # Cấu hình repo GitHub (owner, repo, branch, thư mục)
│   ├── schema.js               # Quy tắc phân loại bài test, CPU, GPU, Game FPS
│   ├── data.js                 # Bộ nạp dữ liệu GitHub API + jsDelivr + LocalStorage Cache
│   └── app.js                  # Bộ định tuyến hash URL, tìm kiếm, lọc, render biểu đồ
├── data/
│   ├── github-snapshot.js      # Snapshot 26 bài test thực tế để chạy offline/local
│   └── sample-data.js          # Dữ liệu dự phòng
├── templates/
│   ├── sample-laptop-metadata.json   # File mẫu cấu hình máy, màn hình, pin
│   ├── laptops.csv             # Template tham khảo
│   └── games.csv               # Template tham khảo
└── README.md                   # Tài liệu hướng dẫn sử dụng
```
