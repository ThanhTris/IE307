# GM-17 implementation plan

Owner/reviewer Trí / ThanhTris. User requested implementation2026-10-13;
history30days explicitly selected. Branch codex/gm-17-access-retention from
origin/main4bb928e55c31dbc4dea185362a66063b65a1f4fd, no commit/push requested.
Contract food-v1/roadmap-v2/GM-17.1, upstream schema0.1.0 →0.2.0.

Inputs: GM-06 PR102 merge7060b8825ad72ee9442d8890719f82451d473c33;
GM-16 PR106 mergef6f2fce9a7ba235892e94a5b92b97485008b95c6. Live Project gate
READY_TO_CLAIM, read fresh; output/handoff read. File ownership0004, SQL suite,
local check/retention/HTTP tooling, HTTP/Bruno suite, access docs/evidence only.
No mobile files, dependencies or business endpoint implementation.

Implement explicit column grants/RLS, private authenticated-caller predicates,
trusted transaction guard, retention reference identities (ADR-015), stable
terminal clock and atomic cleanup. Test old-schema data upgrade, own vs other
identity/anon/publisher, forged/expired HTTP JWT, privacy columns, consent/expiry,
history/ACK surviving operational cleanup and overlapping workers. Run real
PostgreSQL disposable suites plus actual GoTrue/PostgREST HTTP against guarded
local test namespaces. Worker evidence two real60second cycles.

Run upstream GM-06/08 SQL regressions, GM-16 SQL/HTTP429, repository/Python/docs/
diff checks. Write CHECKS/HANDOFF with actual limits and manifest hashes. No
Approved/Done, GitHub Status change, commit, push, PR creation or merge.
