# CI follow-up — exact-version Docker Hub cache

Run40903388804 on d8f1487: GM20 canonical writer passed; GM06 canonical194 passed.
The later isolated HTTP step failed before allocating resources/assertions:
OWNED_QA_IMAGE_NOT_CACHED. The baseline SQL report identifies its actual running
image as supabase/postgres:17.11.0.004 (Docker Hub), while the isolated preflight
only recognizes ECR/GHCR tags. This is a cache-name integration issue; no SQL/API
assertion was skipped to get a pass.

Add the official Docker Hub spelling for the same pinned postgres17.11.0.004 and
postgrest16.4 after the existing ECR/GHCR spellings. Keep offline fail-before-
allocation behavior, exact versions, ownership checks and recommended GHCR pull.
Add cache-selection and wrong-version regressions. Do not use app service config,
change image versions, pull dynamically, weaken schema checks or reset the app DB.

Rerun cache unit tests and latest-chain isolated HTTP; update root manifest and
retain the decimal/create evidence (its five source hashes are unchanged).
