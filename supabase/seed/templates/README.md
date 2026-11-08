
## GM40.2 — received rich storage stage

`dish-catalogue-gm18-stage.schema.json` / `.template.json` describe the separate
Data staging envelope, derived from the received GM18.2 card schema. They do not
replace source `dish-catalogue-v1`1.0.0 or create an API/schema migration. Generate/
check with `python data-preparation/scripts/catalogue_projection.py build --check`.
The source bundle, original manifest/release and18 shared IDs are unchanged;
rich release is `dish-catalogue-v1:1.1.0:gm18.2`. Staging keeps full source provenance
in bundle.json; stage.json contains rich cards and source SHA, without editor or
venue/player identities. Empty template cards are not an importable real release.
See `docs/evidence/roadmap-v2/GM-40/rich-projection/HANDOFF.md` and the offline
`data-preparation/notebooks/prepare_catalogue_projection.ipynb`.
