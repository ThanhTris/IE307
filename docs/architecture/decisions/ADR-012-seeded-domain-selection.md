# ADR-012 — Selector thuần có seed cho GM-15

Ngày 2026-10-11. Owner Vinh đã chọn trực tiếp trong chat: “Bổ sung selector theo seed, giữ AC hiện hành”. Đây là ủy quyền triển khai thay boundary candidate-only trước đây; review implementation của Trí còn Pending, không tự Approved/Done. Policy decision-v2 không đổi luật phiếu/tier hoặc hai vòng.

## Quyết định và contract đề xuất

Giữ evaluateDecision/evaluator contract 1.0.0. Thêm decideWithSeed và selectWinner với selection contract 1.0.0, thuật toán u32-murmur3-rejection-v1; task contract GM-15.2. Seed là chuỗi **đúng 8 ký tự hex lowercase** biểu diễn uint32, bao gồm 00000000 và ffffffff; không trim/coerce/default. Đây là seed chọn winner riêng, không tự parse/reuse rooms.poolSeed (opaque text của pool). Server GM-20 tạo seed riêng một lần bằng entropy phù hợp, giữ kín và persist seed/result/algorithm để retry không bốc lại. Không thêm field SQL hoặc API request seed ở patch domain này.

selectWinner copy rồi JS-sort choice IDs (UTF-16 ordinal, không locale); kiểm nonempty/unique. Counter ban đầu là uint32 seed, mỗi lượt tăng 1 modulo 2^32. Draw là finalizer MurmurHash3: XOR >>>16, multiply 0x85ebca6b; XOR >>>13, multiply 0xc2b2ae35; XOR >>>16, tất cả modulo 2^32. Với n candidates, limit=2^32-(2^32 mod n); bỏ draw >=limit rồi lấy draw mod n. Finalizer là phép hoán vị uint32, counter duyệt hết không gian nên sampling kết thúc. Không Math.random, clock, crypto/network/native dependency, không mutation. Rejection tránh dùng trực tiếp phần đuôi modulo; PRNG không cryptographic. Các seed vectors/repeat tests không là chứng minh thống kê uniform, secure entropy hoặc transaction; GM-20 chịu trách nhiệm random đều một lần theo spec bằng entropy server và contract đã review.

decideWithSeed validates seed rồi gọi evaluator. Chỉ DECISION_READY được chuyển thành DECISION_SELECTED + winnerId; WAITING/ROUND_2/INVALID_INPUT/NO_CONSENSUS giữ nguyên và không có winnerId. Status domain không bổ sung RoomState. candidateIds vẫn nội bộ, không serialize ra client. Server không nhận seed do client chọn và không gọi selector lại sau terminal đã persist.

## Nhận contract và identity

Base main 3076c3deb2937223a007b82211a61a2d61b63c84 chứa PR62/102/103/104. BallotVoteItem.roundDishId map qua round_dishes.id của room/round khóa sang choiceId; pool/roster do GM-19 khóa phía server. Chỉ input accepted/ACK sau xác nhận, không ownVotes/public snapshot/draft KEEP. selectedResultFields map winner choice về row vòng kết quả, chỉ trả policy/reason/tier/winnerRoundDishId; GM-20 lấy winnerDish đúng row và thêm resultId/finalizedAt sau transaction.

Bổ sung GM-07 trong cùng patch để vocabulary khớp DECISION_SPEC + schema: RoomResult types literal, runtime guard kiểm policy/reason/tier/winner, mock phát canonical labels. Shape field không đổi; legacy food-v1/TIER_1/2/NONE/HIGHEST_SCORE bị reject thay vì diễn dịch thiếu bằng chứng. Cần Trang/Trí review supplement này; không gửi message hoặc tự duyệt upstream. Mock vẫn là UI simulation, không thay engine thực thi đa thành viên.

## Kiểm và giới hạn

Giữ 53 golden/28 roster/historical fixtures. Seeded fixtures có expected tĩnh kế thừa spec và vectors số học tường minh, không lấy output engine làm expected. Kiểm tie, 2–8 người, thứ tự pool, repeat/frozen input, veto, rejection threshold, seed sai, mapping và canonical mock/guard. SQL parity, auth, lock, immutable terminals, persist/idempotency/race tiếp tục GM-20. Không thay seed ứng dụng, importer, migration hoặc package/config.
