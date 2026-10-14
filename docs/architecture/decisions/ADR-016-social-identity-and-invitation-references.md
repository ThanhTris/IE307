# ADR-016 — Social identity codes and invitation references

Status: proposed for GM-22 review
Owner/reviewer: Trí / ThanhTris
Contract: `food-v1/roadmap-v2/GM-22.1`

GM-22 assigns a random, stable ten-character friend code to every authenticated
guest. The code is generated from the server CSPRNG with an unambiguous alphabet;
it is never derived from a UUID and is the only lookup key exposed before a pair
is accepted. Display name is copied from validated guest metadata and falls back
to `Khách`; metadata never participates in authorization.

Friend invitations and room invitations write their minimal inbox/event projection
in the same transaction as the invitation. `FRIEND_INVITED` events have no room
context. A UUID-only `gm22_private.friend_refs` table preserves the FK needed by a
pending room invitation after `unfriend`; cleanup may remove that reference only
after invitation, event and ACK retention edges are gone. No push delivery or
profile-edit endpoint is introduced.

RPCs use the GM-19 ACK lookup, request hash, reference lock and endpoint quota
helpers. The caller is always `auth.uid()`. Room acceptance reuses the GM-19
membership/pool refresh path and never changes readiness before recipient consent.
