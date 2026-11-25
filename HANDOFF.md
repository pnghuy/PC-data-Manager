# Bàn giao công việc

File này giúp làm luân phiên giữa **Claude** (bản cloud) và **Antigravity** (trên MacBook, thư mục `~/PC-data-Manager`). Ai làm xong việc thì cập nhật file này trong cùng PR.
Luật chung của repo xem ở `AGENTS.md`.

---

## Trạng thái hiện tại

- **Cập nhật lần cuối:** 2026-11-25, Claude
- **`main` đang có:**
  - App đọc `kho.json` và `laptops.json` của tinhte-charts, hiện 32 máy
  - Giao diện public theo màu Tinh tế, biểu đồ dạng hàng, có số tham khảo
- **PR đang mở (chờ anh merge):**
  - #4 `compare-export`: so sánh 2–4 máy, tab Cinebench/Geekbench/3DMark, tải biểu đồ về PNG
  - PR bàn giao này (AGENTS.md, HANDOFF.md, CLAUDE.md, GEMINI.md)
- **Chưa làm:**
  - Deploy public (Cloudflare Pages hoặc GitHub Pages)
  - Ảnh máy và link bài review trong `laptops.json`: hầu hết máy chưa có, cần anh cung cấp

## Việc tiếp theo (theo thứ tự)

1. **Deploy**
   - Kiểm tra `npm run build` ra `dist/` chạy được: đủ `js/`, `assets/`, `data/`.
   - Thêm hướng dẫn hoặc workflow deploy cho Cloudflare Pages hoặc GitHub Pages.
   - Anh chọn tên miền.
2. **Bổ sung `laptops.json` ở tinhte-charts**
   - Điền `review_url`, `image_url`, màn hình, pin cho các máy đã có bài review.
   - Chỉ điền số có thật.
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
