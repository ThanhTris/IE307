# Test plan v0.2

2026-10-07. Đây là kế hoạch, chưa có kết quả native/backend. Test IDs dùng truy vết FR/task; dependency/package runner chốt ở GM-01.

| ID | Kiểu | Scenario / expected |
| --- | --- | --- |
| T-01 | Native/auth | Guest restart/session expired/names; secure restore/lost-session copy |
| T-02 | RPC race | Ghế thứ8/start-join, join retry unique; snapshot roster/pool giống nhau |
| T-03 | Domain/catalogue | Nướng/lẩu category mềm, pool<=8 không duplicate, snapshot không đổi khi catalogue publish |
| T-04 | Domain + SQL | Fixtures decision-v2, NO/UNSET/missing member/score/tie/candidate parity |
| T-05 | Transaction | Last submit race/lostACK/cancel-vote; một resultId, event sau commit, replay immutable |
| T-06 | UI | Round1 complete/edit trước Gửi, queued/unknown/ACK khóa đúng; lỗi giữ draft |
| T-07 | Domain/UI | Round2 keep/remove, một món explicit confirm, all removed/no third |
| T-08 | Security | UserA/B/host/outsider/anonymous-no-session; vote/invite/history/token ACL, spoof fail |
| T-09 | Network | Mất mạng/reconnect stale version/refetch/poll, không fake completed |
| T-10 | Native | Location first grant/deny/revoke/GPS off/approx/geocode timeout; review query tiếng Việt/app absent/browser/copy/return winner |
| T-11 | Social | Pair pending/accepted/reject/unfriend, avatar room invite accept không mã; full/locked/expiry/race/retry |
| T-12 | A11y | 320/390/768,font200,48dp,TalkBack,dark,reduced motion,image fallback |
| T-13 | Multi-client | 2/4/8 máy, host/member leave/cancel, disconnect giữ roster, progress ACK và same result |
| T-14 | Data | Migration fresh/upgrade,TTL cleanup/public catalogue/license/price nullable |
| T-15 | User pilot | >=5 nhóm, bàn miệng/random hợp lệ/app, đảo thứ tự, thời gian/chọn nhầm/fairness và phiên không match |
| T-16 | Outbox | Persist before send/kill/restart, pending vs ACK,unknown delivery same ID,version conflict attempt mới,stale round/auth/expiry và logout clear |
| T-17 | Push | Development/release build, grant/deny/inbox, event commit,dedupe,receipt/invalid token,offline, cold/warm tap auth/refetch |
| T-18 | Incoming link | QR/schema/host/path/code allowlist, cold/warm session,manual fallback/full/locked/expiry,no app; không deferred claim |
| T-19 | Context | Hour/timezone boundaries,meal override,budget null/unit/source,seed/category diversity,roster/context ready reset |
| T-20 | History | Opt-in partial/all, group key ACL,TTL/delete/rút consent,offline cache,3 recent soft preference không phá pool |
| T-21 | Gesture | Double tap only WANT, no toggle/submit,scroll/single/vertical no vote,detail control,left/right thumb,TalkBack button |
| T-22 | Explainability | Perfect/strict majority/half/allOK/odd n,NO excluded,shared tier không matrix,no-consensus copy/new room |
| T-23 | P1 radius | Dataset coverage/source/date,units/Haversine not route,unknown not zero results,consent meeting point |
| T-24 | P1 account | Link conflict/fail giữ guest,provider proof,auth change không replay user cũ,history sync/delete |

Domain runner dùng sau GM-01, SQL đa auth user trong môi trường test, native recording + logs sanitized. Evidence mỗi task gồm lệnh/version/ngày/device/network/fixture/output và kết quả AC; không token/raw vote/tọa độ thật. HTML prototype không chứng minh push/realtime/native. Negative cases là bắt buộc ở feature rủi ro.

Mục tiêu NFR cập nhật <=2s trên Wi-Fi ổn định cần đo server/client timestamp, không là SLA. User pilot nhỏ không chứng minh thị trường hoặc độ an toàn dị ứng. Không chạy test placeholder rồi báo feature đạt.
