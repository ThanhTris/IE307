# GM-12 Handoff — UI Flashcard, Vòng hai, ACK và Chờ kết quả

- Task / Contract: GM-12 / `food-v1/roadmap-v2/GM-12.2` (ui-figma-final/2026-10-25)
- Owner: Trang (@rosy179)
- Reviewer: Trí (@ThanhTris)
- Branch / Base: `complete_ui_task_seventy_three` / `7e24074` (origin/main)
- Upstream PRs: GM-05 (PR #142), GM-07 (PR #138)
- Issue liên kết: [#73](https://github.com/ThanhTris/IE307/issues/73)

---

## 1. Danh sách Artifacts bàn giao

| Artifact | Mô tả / Vai trò | Lệnh kiểm tra / Route | Task kế thừa tiếp theo |
|---|---|---|---|
| `mobile/src/features/voting/screens/VoteScreen.tsx` | Màn hình bình chọn Vòng 1: hỗ trợ cả chế độ Flashcard tương tác cử chỉ và List view; tích hợp thanh đếm ngược 60 giây và thanh chọn kịch bản Host | Mở route `/room/vote` trên Expo Go | GM-26 (Tích hợp API consumer) |
| `mobile/src/features/voting/screens/FinalRoundScreen.tsx` | Màn hình chọn lọc Vòng 2: áp dụng trần loại Cap 30% ($\max(1, \lfloor 0.30 \times N \rfloor)$), loại bỏ nút "Loại tất cả", hỗ trợ $N=1$, SheetDialog xác nhận | Mở route `/room/final` hoặc chuyển cảnh từ Vòng 1 | GM-26 (Tích hợp API consumer) |
| `mobile/src/features/voting/components/FlashcardDeckView.tsx` | Component chế độ Flashcard: hiển thị thẻ món ăn, chỉ số $k/N$, tiến trình, 3 nút cử chỉ thay thế ($\ge 48\text{dp}$ touch target: `✕ Không ăn`, `★ Muốn ăn`, `✓ Ăn được`), double-tap và nút hoàn tác | Tích hợp trong `VoteScreen` | GM-26 / GM-33 |
| `mobile/src/features/voting/components/CandidateKeepRemoveCard.tsx` | Component thẻ ứng viên Vòng 2: nút Giữ / Loại, tự động vô hiệu hóa nút Loại khi đã chạm trần Cap | Tích hợp trong `FinalRoundScreen` | GM-26 |
| `mobile/src/features/voting/components/FinalRoundHeaderAndOutcome.tsx` | Header Vòng 2, hiển thị huy hiệu trần loại ($X/\text{Cap}$), đồng hồ 60 giây, quyền Host Chốt ngay và kết quả quán quân | Tích hợp trong `FinalRoundScreen` | GM-26 |
| `mobile/src/features/voting/components/VoteScenarioAndStatusBanner.tsx` | Banner trạng thái Vòng 1, đồng hồ 60 giây, thanh chọn kịch bản Host / Member ($1/3$ vs $2/3$ ACK) | Tích hợp trong `VoteScreen` | GM-26 |
| `mobile/src/features/voting/hooks/useRoundOneVoting.ts` | Custom hook quản lý trạng thái Vòng 1: điều hướng flashcard, double-tap, undo trước nộp, khóa tương tác sau ACK, countdown 60s, kiểm tra quyền Host | `npm test -- votingScreens.test.tsx` | GM-26 |
| `mobile/src/features/voting/hooks/useRoundTwoVoting.ts` | Custom hook quản lý trạng thái Vòng 2: tính trần loại Cap 30%, chặn loại vượt trần, nộp payload `KEEP` / `REMOVE`, countdown 60s, kiểm tra quyền Host | `npm test -- votingScreens.test.tsx` | GM-26 |
| `mobile/src/features/voting/fixtures.ts` | Dữ liệu mô phỏng: candidate pools cho $N=1, 3, 4, 10$, tính trần `getRoundTwoEliminationCap`, kiểm tra quyền host `isHostEarlyFinishAllowed` ($A_r > M/2$), hằng số 60s | Import nội bộ | GM-26 / Dev Sandbox |
| `mobile/tests/component/votingScreens.test.tsx` | Bộ 23 bài kiểm thử Jest bao phủ 100% các Acceptance Criteria của GM-12 | `npm --prefix mobile test -- votingScreens.test.tsx` | QA / Reviewer |
| `docs/evidence/roadmap-v2/GM-12/CHECKS.md` | Bảng ghi nhận kết quả kiểm thử tự động, môi trường và giới hạn kỹ thuật | Đọc kèm handoff | Reviewer Trí |
| `docs/evidence/roadmap-v2/GM-12/FIGMA_PARITY.md` | Báo cáo đối chiếu chi tiết các Node Figma `330:3071`, `330:3072`, `330:3073`, `330:3074`, `638:9369`, `617:1671` | Đọc kèm handoff | Reviewer Trí |

---

## 2. Trạng thái hiện tại và Giới hạn đã biết

- **Trạng thái:** Toàn bộ mã nguồn, component, hooks, fixtures, tests và tài liệu đối chiếu đã được hoàn thiện sạch sẽ.
- **Tương thích:** Strict TypeScript 0 lỗi (`tsc --noEmit`), ESLint 0 lỗi (`eslint .`), Architecture boundaries OK, Expo dependencies check OK, xuất Android JS bundle thành công (1,555 modules).
- **Phần việc tiếp theo cho GM-26:** GM-26 sẽ nhận màn hình này để thay thế API mock bằng cuộc gọi API client v4 và RPC Supabase thực tế (`submit_ballot`, `get_session_result`).
- **Nghiệm thu:** Theo đúng quy định dự án tại ADR-013, chỉ chủ dự án Trí (`ThanhTris`) có thẩm quyền review và duyệt nghiệm thu task này. Agent không tự ý đánh dấu `Done` hay `Approved`.
