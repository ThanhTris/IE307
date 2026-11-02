# GM-13.2 — bước 3: vinh danh

Đã có overlay medal/laurel, ảnh món, tên và điểm đúng projection, nút
Chạm để bỏ qua. Hook ghi nhận result đã trình bày trong cùng flow;
refetch/loading rồi nhận lại cùng ID không mở lại intro. Không timer tự
finalize/đổi winner hoặc lưu state cá nhân ra disk.

Tách useDialogMotion dùng chung từ hook GM-10, giữ tên export compatibility
cho consumer cũ; hành vi fade/translate/dismiss/Reduce Motion không đổi.
SheetDialog thêm showTitle mặc định true để riêng overlay đặt medal trước
heading như mẫu. Back có cùng hành động bỏ qua; dismiss chờ animation xong.

Lượt regression đầu có timeout khi test điều hướng chạy animation native.
Đã dùng helper completion có kiểm soát cho test điều hướng; các test motion
riêng vẫn giữ callback thủ công để assert không dismiss sớm và không gọi
hai lần. Không tăng timeout/đổi runner hoặc bỏ assertion nghiệp vụ.

Kết quả cuối:20/20 tests (vinh danh +2 suites GM-10) Pass27.593s; TypeScript
và lint tập trung được kiểm cùng bước4. Motion trên thiết bị vẫn Not run.
