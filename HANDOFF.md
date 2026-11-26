# Bàn giao công việc

File này giúp làm luân phiên giữa **Claude** (bản cloud) và **Antigravity** (trên MacBook, thư mục `~/PC-data-Manager`). Ai làm xong việc thì cập nhật file này trong cùng PR.
Luật chung của repo xem ở `AGENTS.md`.

---

## Trạng thái hiện tại

- **Cập nhật lần cuối:** 2026-11-26, Antigravity
- **`main` đang có:**
  - App đọc `kho.json` và `laptops.json` của tinhte-charts, hiện 32 máy
  - Giao diện public chuẩn màu & phong cách Tinhte.vn (`#0768ea`, mặc định Light mode, Dark mode xám than `#18191a`) + Logo Phương án A (PR #9)
  - Nút chuyển Sáng/Tối (PR #8), dàn trang chống cuộn dài với lọc hãng + 3 nút icon chế độ xem + dải KPI & tab trang máy (PR #10)
  - So sánh 2–4 máy (`#/so-sanh`), tab Cinebench/Geekbench/3DMark, tải biểu đồ về PNG
  - Đã deploy thử nghiệm trên GitHub Pages (`https://pnghuy.github.io/PC-data-Manager/`) qua workflow `.github/workflows/deploy-pages.yml`
- **PR đang mở:** `i18n-multilang` (đa ngôn ngữ giao diện: Tiếng Việt mặc định + 5 ngôn ngữ phổ biến English, 中文, 日本語, 한국어, Español qua bộ chọn trên topbar)
- **Chưa làm:**
  - Ảnh thực tế máy và link bài review trong `laptops.json` (hầu hết máy chưa có, cần anh cung cấp)
  - Gắn tên miền riêng sau khi hoàn thiện ảnh máy

## Việc tiếp theo (theo thứ tự)

1. **Bổ sung `laptops.json` ở tinhte-charts**
   - Điền `image_url` (ảnh thực tế của máy), `review_url`, màn hình, pin cho các máy đã có bài review.
   - Chỉ điền số có thật.
2. **Gắn tên miền riêng & public chính thức**
   - Sau khi giao diện, logo và ảnh máy đã chỉn chu, gắn tên miền riêng (Cloudflare Pages hoặc GitHub Pages, xem mục 5 `README.md`).
3. **(Chờ dữ liệu) Geekbench cắm sạc và chạy pin**
   - Chỉ làm khi `kho.json` có điểm đo lúc chạy pin, ví dụ thêm id bài test `geekbench-7-battery` ở Chart Studio.

## Việc đang làm dở

- Không có.

---

## Quy trình mỗi lần đổi qua lại

**Trước khi bắt đầu** (trong Terminal trên Mac, ở thư mục `~/PC-data-Manager`):
```bash
git checkout main
git pull
git checkout -b ten-viec-ngan-gon   # ví dụ: deploy-cloudflare
```
Claude cloud tự làm bước này trên bản clone của nó.

**Khi làm xong:**
1. Cập nhật mục "Trạng thái hiện tại", "Việc tiếp theo" và "Việc đang làm dở" ở trên. Ghi ngày và tên người hoặc công cụ làm (Claude / Antigravity).
2. Chạy `npm run lint` và `npm run validate`.
3. Commit và push:
   ```bash
   git add -A
   git commit -m "Mô tả ngắn việc đã làm"
   git push -u origin ten-viec-ngan-gon
   ```
4. Mở PR trên GitHub, anh review rồi merge.
5. Sau khi merge, ở Mac chạy `git checkout main && git pull` để bản local luôn giống GitHub. Đây cũng là bản backup local.

**Nếu phải dừng giữa chừng:**
- Vẫn commit và push nhánh đang làm.
- Ghi vào "Việc đang làm dở": tên nhánh, đã xong gì, còn thiếu gì.
- Không để việc chỉ nằm trên máy mà chưa push.

**Không bao giờ:**
- Hai công cụ cùng sửa một nhánh cùng lúc
- Push thẳng lên `main`
- Bịa điểm benchmark

## Câu lệnh mở phiên mới

Dán câu này khi mở phiên Antigravity hoặc Claude:

> Đọc AGENTS.md và HANDOFF.md trong repo PC-data-manager. Chạy `git checkout main && git pull` rồi làm tiếp mục đầu tiên trong "Việc tiếp theo" (hoặc tiếp phần trong "Việc đang làm dở" nếu có). Làm trên nhánh mới, xong thì cập nhật HANDOFF.md, commit, push và mở PR cho anh review.

Muốn làm việc khác thì thay nửa sau của câu bằng việc cụ thể, giữ nguyên phần "Đọc AGENTS.md và HANDOFF.md".

---

## Nhật ký

| Ngày | Ai | Việc |
|---|---|---|
| 2026-10-16 | Antigravity | Khung app ban đầu (đọc thư mục `data/` qua GitHub API) |
| 2026-11-08 | Antigravity | Thêm Vite, ESLint, script sync/validate/build |
| 2026-11-25 | Claude | PR #1: đổi nguồn sang `kho.json` (gộp tên bài test, không lộ ngoại lệ bài khách) |
| 2026-11-25 | Claude | PR #2 + tinhte-charts #7: thêm `laptops.json` |
| 2026-11-25 | Claude | PR #3: giao diện public |
| 2026-11-25 | Claude | PR #4: so sánh nhiều máy, tab bài cùng họ, tải PNG |
| 2026-11-25 | Claude | PR bàn giao: AGENTS.md, HANDOFF.md |
| 2026-11-25 | Antigravity | PR #7: chuẩn bị deploy (`dist/`, workflow GitHub Pages, hướng dẫn Cloudflare/GitHub Pages) |
| 2026-11-25 | Antigravity | PR #8: thêm nút chuyển giao diện Sáng/Tối trên topbar (lưu `localStorage`) |
| 2026-11-26 | Antigravity | PR #9: bảng màu & phong cách chuẩn Tinhte.vn (`#0768ea`, mặc định Light mode), Logo Phương án A |
| 2026-11-26 | Antigravity | PR #10: dàn trang chống cuộn dài (lọc hãng, 3 nút icon chuyển chế độ xem, dải KPI + tab trang máy) |
| 2026-11-26 | Antigravity | Thêm đa ngôn ngữ giao diện (Tiếng Việt mặc định + English, 中文, 日本語, 한국어, Español) |
