# GM-22 implementation plan

Contract `food-v1/roadmap-v2/GM-22.1`, schema `0.4.0`, upstream `5b148de`.
Implement server-owned social identity, canonical friend invitations/pairs,
room invitation accept/reject and caller-scoped inbox using GM-17/19 ACL, ACK,
reference and rate-limit helpers. Add only the client DTO/guard/mock methods
needed for `get_my_social_identity` and `reject_room_invite`; Android UI remains
the GM-28 consumer handoff.

Validation uses a disposable database built from every migration, real local
guest JWTs, synthetic published catalogue rows, SQL pgTAP assertions, HTTP
runner assertions and the Bruno desktop collection. Production/app data is not
reset or used as a positive fixture.
