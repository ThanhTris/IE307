# RPC contract — draft v1

Supabase token xác định caller; không cho caller tự khai userId khác. Mọi write có requestId UUID; room write có expectedVersion. Error code ổn định, không expose SQL/token.

| RPC | Input đặc thù | Output / gate |
| --- | --- | --- |
| create_room | displayName, mealSlot | roomId/code/version; caller host; rate limit |
| join_room | code, displayName | snapshot; idempotent member; LOBBY còn ghế; không cần expectedVersion trước khi biết room |
| get_room_snapshot | roomId | state/version, member names/ready/progress, pool, ownBallot/ownSubmission, result; không raw votes người khác |
| update_preferences | roomId, categoryIds | own ready=false, LOBBY |
| update_meal | roomId, mealSlot | host; reset ready mọi người |
| set_ready | roomId, ready | member trong LOBBY |
| start_round | roomId | host; đủ người/ready; snapshot nguyên tử |
| submit_ballot | roomId, round, votes[{dishId,value}] | accepted/version/state/result; đủ toàn bộ pool |
| leave_room | roomId, confirmCancel | lobby member rời; host/active member xác nhận hủy |
| cancel_room | roomId, confirmCancel | host, terminal immutable |
| invite_partner / accept_partner P1 | invitation code/id | không auto join/ready |

Success `{ok:true,requestId,roomId,version,state,data}`; read không cần requestId. Error `{ok:false,code,messageKey,currentVersion?}`.

Codes: AUTH_REQUIRED, INVALID_INPUT, ROOM_NOT_FOUND, ROOM_FULL, ROOM_LOCKED, ROOM_EXPIRED, NOT_MEMBER, NOT_HOST, NOT_READY, INCOMPLETE_BALLOT, INVALID_DISH, ALREADY_SUBMITTED, VERSION_CONFLICT, REQUEST_ID_REUSED, RATE_LIMITED, ROOM_TERMINAL.

Server lock serialize writes. Hai người gửi cùng version: người nhận VERSION_CONFLICT refetch; nếu vẫn cùng vòng/chưa submitted thì retry nháp bằng requestId mới. Timeout không biết đã ghi chưa: retry cùng ID/payload để lấy ACK cũ. Client không tự tăng round/version.

Realtime chỉ roomId/version/state hoặc tiến độ tổng hợp; member mới subscribe được. Event là tín hiệu refetch; reconnect snapshot trước enable submit. Poll fallback có backoff, ngừng khi unmount/terminal.

Tests: payload thiếu/trùng/thừa dish; ID lặp payload khác; outsider/spoof host; tranh ghế; submit cuối đồng thời; cancel-vote race; expiry; response không chứa phiếu người khác.
