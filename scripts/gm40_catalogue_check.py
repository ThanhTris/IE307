"""GM40 importer QA requires an explicit received GM03 manifest (GM40.3).

Historical standalone/app-container runner has been replaced; no default fallback.
"""
from gm40_manifest_check import main, run

if __name__ == '__main__':
    main()
