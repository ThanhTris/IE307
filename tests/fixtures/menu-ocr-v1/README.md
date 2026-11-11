# GM36.1 synthetic fixtures

`request.json` contains a synthetic 1×1 PNG, a synthetic source UUID and a rights
DECLARATION for testing only. It is not a real menu, licensed source or rights approval.
`provider-output.json` is manually authored recognizer output, not an OCR result.
`expected-draft.json` is the independently specified expected contract projection:
NFC Phở bò/35000–45000 VND/portion; uncertain name/price null; unknown tea unit null.
No image/menu accuracy, provider call, user survey or verified dataset is claimed.

Run `node --test tests/gm36-menu-ocr.test.mjs` and
`python3 -m unittest discover -s tests -p 'test_gm36_menu_ocr.py'`.
These fixtures must never be published or substituted for GM34/provider pilot.
