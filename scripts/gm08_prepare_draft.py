#!/usr/bin/env python3
"""Derive a GM-08 staging candidate from frozen GM-04 draft; never verify/publish."""
from datetime import datetime, timezone
import argparse
import importlib.util
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from gm04_contract_model import adapt_food_legacy
from validate_field_contracts import load_json
spec=importlib.util.spec_from_file_location('food_import',ROOT/'supabase/seed/import_food_data.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output',type=Path,required=True)
    p.add_argument('--report',type=Path,required=True)
    p.add_argument('--as-of',default=None)
    a=p.parse_args()
    source=ROOT/'data-preparation/snapshots/editorial-v0.2.0/catalogue.json'
    old=load_json(source)
    bundle=adapt_food_legacy(old)
    at=a.as_of or datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
    report=module.preflight(bundle,at)
    if not report['valid']:raise ValueError(report['errors'])
    if a.output.exists():raise ValueError('Output exists; do not overwrite reviewed/staged input')
    module.write_json(a.output,bundle)
    report.update(state='draft_candidate',fixtureOnly=False,verified=False,publicationPerformed=False,
                  sourcePath=str(source.relative_to(ROOT)),sourceSha256=module.digest(source.read_bytes()),
                  candidateSha256=module.digest(a.output.read_bytes()),
                  observedPriceReferences=247,observedPriceBranches=21,
                  limitations=['39 editorial draft dishes, not verified offerings',
                    'no actual venue/offering/schedule/coverage/anchor records',
                    'menu rights, dine_in, freshness and independent content review pending',
                    'no artwork selected; image metadata is not permission'],
                  publishBlockers=module.preflight(bundle,at,publish=True)['errors'])
    module.write_json(a.report,report)
    print('Draft only; candidate='+str(a.output)+'; report='+str(a.report))


if __name__=='__main__':main()
