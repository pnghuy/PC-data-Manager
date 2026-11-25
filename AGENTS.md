# Tinh tế Laptop Lab: hướng dẫn chung cho AI (Claude, Antigravity/Gemini…)

File này là luật chung của repo. Claude đọc qua `CLAUDE.md`, Antigravity/Gemini đọc qua `GEMINI.md`; cả hai đều trỏ về đây.
Trạng thái công việc hiện tại, việc đang làm dở và việc tiếp theo nằm trong **`HANDOFF.md`**. Đọc file đó ngay sau file này.

## App này là gì
- Web tĩnh (HTML + CSS + JavaScript thuần, không framework) cho member Tinh tế tra cứu kết quả test laptop: tìm máy, xem biểu đồ so sánh, so sánh nhiều máy, tải biểu đồ về PNG.
- **App chỉ để xem.** Không thêm upload CSV, form thêm/sửa/xoá máy hay lưu dữ liệu trong trình duyệt (localStorage chỉ dùng làm bộ đệm tải nhanh).
- Nhập điểm benchmark làm ở **Tinhte Chart Studio** (https://claude.ai/artifact/Lj5az4TmARVrotxWUmjvPa). Chart Studio ghi vào `kho.json` của repo `pnghuy/tinhte-charts`.

## Dữ liệu
Dữ liệu không nằm trong repo này. App đọc hai file ở gốc repo **`pnghuy/tinhte-charts`** (nhánh `main`):

| File | Nội dung | Ai sửa |
|---|---|---|
| `kho.json` | Kho máy và điểm: `devices{id:{name,cpu,gpu,type,measured,chipOnly?,scores{testId:[...]}}}` | Chart Studio (hoặc PR vào tinhte-charts) |
| `laptops.json` | Thông tin thêm theo id máy: `test_date`, `review_url`, `image_url`, `ram`, `display{}`, `battery{}`, `price`, `hidden`, `show` | PR vào tinhte-charts |

- Thứ tự tải: raw.githubusercontent → jsDelivr → bộ đệm trình duyệt → `data/kho-snapshot.js` (cập nhật bằng `npm run sync-data`).
- Id bài test phải trùng với `TESTS` của Chart Studio, khai báo trong `js/schema.js` (`LAB.TESTS`). Thêm bài mới ở Chart Studio thì thêm vào đây cùng id.
- Máy có thẻ riêng: `measured: true`, loại laptop/desktop, không phải `chipOnly`. Có thể chỉnh bằng `show`/`hidden` trong `laptops.json`.
- Số không do Tinh tế đo (`measured: false`) luôn ghi nhãn "tham khảo" và không được tính vào thứ hạng hay "Tốt nhất".

## Luật bắt buộc
1. **Không bịa, không làm tròn hay chỉnh điểm.** Chỉ hiện số có trong `kho.json`/`laptops.json`. Thiếu số thì để trống hoặc ghi "Chưa có số".
2. **Tên máy giữ đủ thương hiệu**, ví dụ "Acer Nitro ProPanel ANV16". Biểu đồ CPU ghi tên chip CPU; biểu đồ đồ hoạ của máy chỉ có iGPU thì ghi tên iGPU. Quy tắc này đã có trong `deviceLabel()` ở `js/data.js`.
3. **Ngoại lệ bài khách không áp dụng cho app.** Bài tài trợ có thể ẩn tên máy so sánh, chỉ ghi tên chip (ví dụ bài Acer ANV16), nhưng chỉ sửa file chart trong `tinhte-charts/data/`. App đọc `kho.json` nên member luôn thấy tên đầy đủ. Không làm app đọc thư mục `data/`.
4. Khi nói về kiến trúc CPU/GPU trong giao diện, dùng chữ **"nhân"**, không dùng "lõi".
5. Mỗi việc **một nhánh, một PR**. Không push thẳng lên `main`. Người dùng (pnghuy) tự review và merge.

## Cấu trúc code
```
index.html            khung trang, nạp script theo thứ tự config → schema → snapshot → data → export → app
assets/style.css      giao diện sáng/tối, màu Tinh tế (#0088cc, xanh lá #5aaf33)
js/config.js          repo/nhánh/tên file dữ liệu
js/schema.js          LAB.TESTS (id bài test), nhóm hiển thị, thông số màn hình/pin
js/data.js            tải kho.json + laptops.json, dựng danh sách máy, biểu đồ, thứ hạng
js/export.js          xuất một biểu đồ ra PNG bằng canvas
js/app.js             định tuyến (#/, #/may/<id>, #/so-sanh?m=a,b), trang chủ, trang máy, so sánh
scripts/              sync-charts.mjs, validate-data.mjs, build.mjs, serve.mjs
data/kho-snapshot.js  bản dự phòng dữ liệu
```
- `#/?debug=1`: hiện nguồn dữ liệu, nút tải lại và danh sách lưu ý dữ liệu (dành cho người quản lý).

## Lệnh
- `npm install`, sau đó `npm run dev` (http://localhost:3000) hoặc `npm run serve` (không cần cài gói).
- Trước khi mở PR: `npm run lint` và `npm run validate`. Mở trang, xem trang chủ, trang một máy và trang so sánh ở cả desktop và điện thoại.
- `npm run build` tạo thư mục `dist/` để deploy.

## Phong cách
- Chữ trên giao diện, commit và PR viết tiếng Việt, câu đầy đủ, ngắn gọn.
- Chỉ dùng thư viện ngoài khi thật cần. Hiện tại app không có dependency khi chạy.
