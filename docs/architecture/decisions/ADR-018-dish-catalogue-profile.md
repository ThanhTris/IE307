# ADR-018 — Catalogue món độc lập với dữ liệu nơi bán

Date: 2026-10-21
Status: **Proposed — chờ Trí (@ThanhTris) duyệt; chưa thay schema/API**.
Task: [GM-40 / #125](https://github.com/ThanhTris/IE307/issues/125).
Contract đề xuất: `dish-catalogue-v1/roadmap-v2/GM-40.1`, schema/profile `1.0.0`.

## Căn cứ và điểm dừng

Issue yêu cầu: “Chốt supplement/ADR hẹp với Trí trước thay schema/API”. Yêu cầu triển khai
của Vinh chốt làm phần độc lập trước và giữ điểm duyệt này; không phải quyết định duyệt
kiến trúc thay Trí. Chỉ inventory/dictionary/schema JSON/template/bundle/fixtures và
offline validator được thực hiện ở mốc hiện tại. Chưa có SQL importer, migration,
RPC, DTO runtime hoặc activation mới. Trí cần duyệt các đề xuất dưới đây trước bước đó.

## Quyết định đề xuất

1. Thêm profile `dish-catalogue-v1` song song với food-v1. Danh sách món không cần
   quán, offering, lịch bán, anchor, coverage hay khoảng cách. Nguồn menu vẫn là
   provenance hợp lệ; origin/buổi ăn không là bằng chứng nơi bán hoặc giờ mở cửa.
2. Dùng 39 UUID món đã có. 18 ID GM-08 là tập con; không cộng số lượng hoặc tạo ID
   mới. Giữ toàn bộ legacy bundle, registry, mapping, cache và các record/snapshot
   đã khóa. Không đổi luật vote, score, tier, seed, cap hoặc hai vòng.
3. Release catalogue lưu riêng, bất biến theo `(profile, datasetVersion, hash)`.
   Private tables `gm40_private.releases` và `release_dishes` lưu manifest/nội dung
   theo release, cùng taxonomy/nguồn/giá được pin trong payload release. Chỉ một
   test/demo release active trong namespace riêng. Không cập nhật active food-v1.
   Hash trên bytes UTF-8 của bundle trong manifest; record version thuộc món, không
   thay thế schema/dataset version. Không overwrite metadata legacy cùng UUID.
4. Khi cần FK identity của `round_dishes`/history, thêm các canonical dish identity
   còn thiếu vào bảng legacy bằng thông tin draft hợp lệ; giữ nguyên các hàng đã có.
   Metadata catalogue theo release được đọc từ private release, không từ record
   legacy có thể khác version. Taxonomy/source trùng ID nhưng khác định nghĩa phải
   báo conflict; không tự cập nhật để qua import. Toàn bộ ghi thuộc một transaction.
5. Thêm `source_profile` cho `round_dishes`, mặc định `food-v1` khi nâng cấp;
   `catalogue_release_id` chỉ dùng cho catalogue. CHECK phân nhánh:
   - food-v1: đủ offering/venue/schedule/scheduleVersion, catalogue release null;
   - dish-catalogue-v1: release+canonical dish có composite FK tới release_dishes,
     các liên kết nơi bán đều null.
   Giữ room/member/choice/round/ordinal/version constraints và RLS. Price thiếu
   dùng object price hiện hành với các trường nullable=null; không dùng 0 hoặc
   giá menu của một biến thể làm giá món gốc. Snapshot chứa nội dung đã pin và không
   tự cập nhật khi đổi release. Không cho client ghi private adapter hoặc bảng.
6. Private adapter nhận room hợp lệ, locked choice IDs và release cụ thể; kiểm
   trạng thái/version/roster/pool trước ghi. Nó không tạo public flow mới hoặc lấy
   lại offering. Chuyển vòng GM-20 phải copy discriminator/release và projection
   đã pin. Snapshot/result lấy locked metadata; giữ tích hợp writer GM-21 và inbox
   GM-23 trên main. Kiểm legacy hai vòng/finalize và source catalogue bằng SQL thật.
7. Thêm RPC có auth `read_dish_catalogue` và `preview_dish_catalogue` với DTO riêng
   (release/version/hash + dish metadata + reference prices). Không giả roundDishId,
   không bắt anchor/radius/serviceMode. Preview không chọn winner, xếp hạng hoặc
   áp luật cap mới. Guards riêng không nới DTO legacy. DB test/demo bật bằng cấu hình
   trusted server, mặc định off; auth không tự cấp quyền ghi hoặc đọc draft production.
8. **Giữ nguyên public create_room và RoomContext.** Room adapter ở GM-40 chứng
   minh khả năng lưu/đọc món catalogue trong room hợp lệ hiện có, không tuyên bố đã
   cung cấp public luồng tạo room không cần địa điểm. UI/consumer tích hợp riêng khi
   được giao; không thêm dependency ngược về task cũ.

## Import, khôi phục và rollout đề xuất

- Importer validate/stage/import/readback trên DB test riêng, kiểm migration ledger,
  definitions và namespace sở hữu. Cùng version/hash là no-op; cùng version khác
  hash là conflict. Ghi release/items/identity/activation/receipt trong một transaction,
  lock namespace activation để hai import không kích hoạt lẫn nhau.
- Chuyển release active chỉ sau validate/readback thành công. Rollback trỏ về release
  trước, không xóa release đã có snapshot tham chiếu; snapshot terminal không đổi.
- Chọn số migration còn trống khi được duyệt và cập nhật main; không giữ trước số
  0026, không sửa SQL đã merge, reset DB ứng dụng hoặc production deploy.
- Catalogue draft `test_demo`, fixture riêng `fixtureOnly=true`; không nâng review,
  quyền ảnh hoặc publish guards. Trước activation sử dụng thật phải nghiệm thu đủ GM-40.

## Kiểm bắt buộc sau điểm duyệt

DB thật: import/readback/reimport/conflict/failure atomicity/rollback, zero venue
data trong profile, old identities không đổi. HTTP bằng JWT thật: auth, DTO/guard,
release pinning, disabled demo mode và không có quyền ghi. Snapshot catalogue và
legacy: chuyển vòng/finalize/retry/result/history/inbox cùng ACL trước/sau upgrade.
GM-08/18/19/20/21 regression giữ nguyên assertions. UI/Android không nằm trong scope.

## Quyết định review

Pending. Chưa có xác nhận của Trí cho ADR này. Không tự điền Approved, ngày duyệt
hoặc Review-evidence. Handoff hiện tại chỉ là mốc dữ liệu offline.
