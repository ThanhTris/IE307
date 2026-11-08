"""GM40.2 Data adapter for the delivered GM18.2 projection; offline by default.

Source catalogue and baseline importer are immutable inputs. DB operations delegate
to the received owned-QA importer; no SQL/RPC implementation is duplicated here.
"""
from __future__ import annotations
import argparse
from copy import deepcopy
import hashlib
import importlib.util
import json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('gm40_received_gm18', ROOT/'supabase/seed/import_gm18_catalogue.py')
received = importlib.util.module_from_spec(spec)
spec.loader.exec_module(received)
upstream = received.upstream
contract, food = upstream.contract, upstream.food
candidate, cards, release_id = upstream.candidate, received.cards, received.release_id
install, readback, activate = received.install, upstream.readback, upstream.activate
DIRECTORY = ROOT/'supabase/seed/catalogue/gm18.2'
API_SCHEMA = ROOT/'docs/architecture/schemas/gm18-dish-catalogue.schema.json'
SCHEMA_PATH = ROOT/'supabase/seed/templates/dish-catalogue-gm18-stage.schema.json'
TEMPLATE_PATH = ROOT/'supabase/seed/templates/dish-catalogue-gm18-stage.template.json'


def digest(value):
    return hashlib.sha256(contract.encoded(value)).hexdigest()


def schema_document():
    schema = deepcopy(json.loads(API_SCHEMA.read_text(encoding='utf8')))
    schema.pop('oneOf')
    card = schema['$defs']['card']
    card['properties']['projectionVersion'] = {'const': received.VERSION}
    card['required'].append('projectionVersion')
    schema.update({'$id':'urn:anyfood:gm40:gm18.2-stage:1.0.0',
                   'title':'GM40 staged storage projection; received GM18.2 card fields',
                   'type':'object','additionalProperties':False,
                   'properties':{
                       'contractVersion':{'const':received.CONTRACT},
                       'projectionVersion':{'const':received.VERSION},
                       'releaseId':{'type':'string','pattern':r'^dish-catalogue-v1:.*:gm18\.2$'},
                       'sourceBundleSha256':{'type':'string','pattern':'^[0-9a-f]{64}$'},
                       'sourceContractVersion':{'const':'1.0.0'},
                       'datasetVersion':{'type':'string','pattern':r'^\d+\.\d+\.\d+$'},
                       'testOnly':{'const':True},
                       'cards':{'type':'array','items':{'$ref':'#/$defs/card'}}}})
    schema['required'] = list(schema['properties'])
    return schema


def document(bundle, source_sha):
    result = {'contractVersion':received.CONTRACT,'projectionVersion':received.VERSION,
              'releaseId':release_id(bundle),'sourceBundleSha256':source_sha,
              'sourceContractVersion':bundle['contractVersion'],
              'datasetVersion':bundle['datasetVersion'],'testOnly':True,'cards':cards(bundle)}
    Draft202012Validator(schema_document(),format_checker=FormatChecker()).validate(result)
    ids = [c['dishId'] for c in result['cards']]
    if len(ids)!=len(set(ids)) or set(ids)!={d['id'] for d in bundle['entities']['dishes']}:
        raise ValueError('Projection identities differ from validated source')
    return result


def coverage(bundle, projection):
    rows = projection['cards']
    meals = ['breakfast','lunch','dinner','snack']
    prices = {}
    for row in bundle['entities']['priceReferences']:
        prices.setdefault(row['dishId'],[]).append(row)
    ties = []
    for key, observations in prices.items():
        times = [received.stamp(p['checkedAt']) for p in observations]
        times = [t for t in times if t is not None]
        if times and times.count(max(times))>1:ties.append(key)
    terms = []
    for t in sorted(bundle['entities']['taxonomy'],key=lambda t:t['id']):
        if t['type'] not in ('cuisine','category'):continue
        field = 'cuisineIds' if t['type']=='cuisine' else 'categoryIds'
        terms.append({k:t[k] for k in ['id','type','code','label','version']} | {
            'dishCount':sum(t['id'] in c[field] for c in rows),
            'mealCounts':{meal:sum(meal in c['mealSlots'] and t['id'] in c[field] for c in rows) for meal in meals}})
    return {'sourceBundleSha256':projection['sourceBundleSha256'],'releaseId':projection['releaseId'],
            'testOnly':True,'dishCount':len(rows),
            'meals':{m:{'available':sum(m in c['mealSlots'] for c in rows),
                        'shortfall10':max(0,10-sum(m in c['mealSlots'] for c in rows)),
                        'shortfall20':max(0,20-sum(m in c['mealSlots'] for c in rows))} for m in meals},
            'unlabelledMeals':sum(not c['mealSlots'] for c in rows),
            'unknown':{f:sum(c[f] is None or c[f]=='unknown' for c in rows) for f in ['temperature','flavor','artwork']},
            'price':{'observations':len(bundle['entities']['priceReferences']),
                     'selected':sum(c['priceObservation'] is not None for c in rows),
                     'displayable':sum(c['priceReference'] is not None for c in rows),
                     'latestTimestampTieDishIds':sorted(ties)},
            'terms':terms,'filterSemantics':'mealSlot is the received hard filter; term cross-tabs are descriptive, preference ranking remains UNSUPPORTED'}


def build():
    bundle, sha = candidate(ROOT/contract.BUNDLE_PATH, ROOT/contract.MANIFEST_PATH)
    projection = document(bundle,sha)
    schema = schema_document()
    Draft202012Validator.check_schema(schema)
    template = {**projection,'cards':[]}
    report = coverage(bundle,projection)
    manifest = {'adapterVersion':'GM40.2','releaseId':projection['releaseId'],
                'sourceBundleSha256':sha,'projectionSha256':digest(projection),
                'cardsSha256':digest(projection['cards']),'schemaSha256':digest(schema),
                'upstreamSchemaSha256':hashlib.sha256(API_SCHEMA.read_bytes()).hexdigest(),
                'sourceManifestSha256':hashlib.sha256((ROOT/contract.MANIFEST_PATH).read_bytes()).hexdigest(),
                'dishCount':len(projection['cards']),'sourceCounts':{k:len(v) for k,v in bundle['entities'].items()},
                'contractVersion':received.CONTRACT,'projectionVersion':received.VERSION,
                'datasetVersion':bundle['datasetVersion'],'status':'draft','testOnly':True,
                'activation':'offline build never activates a database','reviewedBy':None}
    return {DIRECTORY/'projection.json':contract.encoded(projection),
            DIRECTORY/'coverage.json':contract.encoded(report),
            DIRECTORY/'manifest.json':contract.encoded(manifest),
            SCHEMA_PATH:contract.encoded(schema),TEMPLATE_PATH:contract.encoded(template)}


def stage(path, directory, manifest_path=None):
    bundle, sha = candidate(path,manifest_path)
    result = document(bundle,sha)
    directory = Path(directory)
    if Path(path).resolve().is_relative_to(directory.resolve()):
        raise ValueError('Stage must not contain/overwrite source')
    for name in ['bundle.json','stage.json']:
        if (directory/name).is_symlink():raise ValueError('Stage output cannot be a symlink')
    raw = Path(path).read_bytes()
    if hashlib.sha256(raw).hexdigest()!=sha:raise ValueError('Source changed after validation')
    directory.mkdir(parents=True,exist_ok=True)
    (directory/'bundle.json').write_bytes(raw)
    (directory/'stage.json').write_bytes(contract.encoded(result))
    return result


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('operation',choices=['build','validate','stage','import','readback','activate'])
    p.add_argument('--check',action='store_true')
    p.add_argument('--input',type=Path,default=ROOT/contract.BUNDLE_PATH)
    p.add_argument('--manifest',type=Path,default=ROOT/contract.MANIFEST_PATH)
    p.add_argument('--directory',type=Path)
    p.add_argument('--database');p.add_argument('--namespace');p.add_argument('--release-id');p.add_argument('--activate',action='store_true')
    a=p.parse_args()
    if a.operation=='build':
        for path,raw in build().items():
            if a.check:
                if not path.exists() or path.read_bytes()!=raw:raise ValueError('Generated projection drift: '+str(path))
            else:path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)
        output={'result':'Pass','check':a.check}
    elif a.operation in ['validate','stage']:
        b,s=candidate(a.input,a.manifest)
        if a.operation=='stage':
            if not a.directory:p.error('--directory required')
            projection=stage(a.input,a.directory,a.manifest)
        else:projection=document(b,s)
        output={'releaseId':projection['releaseId'],'sourceBundleSha256':s,'projectionSha256':digest(projection),'dishCount':len(projection['cards'])}
    else:
        if not a.database or not a.namespace:p.error('Owned QA --database and --namespace required')
        db=food.LocalDB(a.database)
        if a.operation=='import':row=install(db,a.namespace,a.input,a.manifest,a.activate)
        else:
            if not a.release_id:p.error('--release-id required')
            row=(activate if a.operation=='activate' else readback)(db,a.namespace,a.release_id)
        output={'releaseId':row['id'],'count':len(row['cards']),'active':row['active'],'sourceSha256':row['source_sha']} if row else None
    print(json.dumps(output,ensure_ascii=False,indent=2))


if __name__=='__main__':main()
