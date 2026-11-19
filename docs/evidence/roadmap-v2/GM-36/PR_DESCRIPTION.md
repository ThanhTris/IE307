## Task và phạm vi

Refs #97. Owner Tâm (@HoaiTam), reviewer Trí (@ThanhTris).
Nhánh `codex/gm-36-menu-ocr` → `main`, đã đồng bộ với `5bbee5d`.

Đề xuất nghiệm thu phần pipeline OCR độc lập. Handler trả draft có nguồn và confidence, giữ null cho dữ liệu mơ hồ, và không tự import/publish. Khoảng giá `35-45k` giữ null. Profile dish-only không cần quán, offering, coverage hay lịch bán. Cả importer catalogue lẫn legacy đều từ chối draft nhập trực tiếp.

## Start và merge gate

- [x] Start gate `READY_TO_CLAIM`. GM-04, GM-07, GM-08 và GM-34 đều Done. Hồ sơ GM-34 nằm trên main từ `5a69b56`.
- [x] Checker merge với `--verify-outputs` trả `READY_FOR_MERGE_REVIEW` cho artifact/dependency tại `5bbee5d`.
- [ ] Trí xác nhận có thể nghiệm thu phạm vi pipeline độc lập. Nếu nghiệm thu full OCR, cần quyết định provider, license, quyền dùng ảnh, privacy, quota/cost và pilot nhận dạng thật theo AC.

## Kiểm thử và bàn giao

- [x] Strict TypeScript, 48 test Node, 12 test Python feature, suite Python 703 ca với 6 skip, validator repo, task indexes và diff.
- [x] 15/15 ca HTTP, GoTrue, schema, từ chối import trực tiếp ở cả hai importer và cleanup đều đạt trên `709defe`. Recognizer giả lập. [GitHub Actions](https://github.com/ThanhTris/IE307/actions/runs/44497479002)
- [ ] Provider thật, pilot menu có quyền và kiểm thiết bị theo phạm vi nghiệm thu được duyệt.

Bằng chứng và cách chạy nằm trong CHECKS.md, HANDOFF.md và PROVIDER_REVIEW.md tại `docs/evidence/roadmap-v2/GM-36/`. Entrypoint mặc định tắt.
