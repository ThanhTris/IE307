"""Offline, owner-confirmed source-to-base mapping. Never contacts a provider."""
from __future__ import annotations
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path
import uuid

BASE = Path(__file__).resolve().parents[1]
csv.field_size_limit(16 * 1024 * 1024)

def stable_id(entity, registry_key):
    return str(uuid.uuid5(uuid.uuid5(uuid.NAMESPACE_URL, f'anyfood:food-v1:{entity}'), registry_key))

def load_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))

def read_csv(path):
    with Path(path).open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))

def write_csv(path, rows, fields):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: json.dumps(v, ensure_ascii=False, separators=(',', ':'))
                             if isinstance(v, (list, dict)) else v for k, v in row.items()})

def convert_profile(row, codebook=None):
    codebook = codebook or load_json(BASE / 'config/taxonomy_v1.json')
    reverse = {label: key for key, label in codebook['cuisines'].items()}
    categories = []
    for group, column in [('family', 'taxonomy_categories_json'), ('preparation', 'taxonomy_methods_json')]:
        labels = json.loads(row[column])
        categories.extend(f'{group}:{key}' for key, label in codebook['categoryGroups'][group].items() if label in labels)
    flavors = {}
    for kind, value in json.loads(row['taxonomy_flavors_json']).items():
        level = {'không có — nguồn nói rõ':'none','nhẹ':'low','vừa':'medium','nhiều':'high',
                 'có vị này, chưa rõ mức':'unknown','unknown':'unknown'}.get(value)
        if level is None:
            raise ValueError(f'Unrecognized flavor: {value}')
        flavors[kind] = {'present': None if value == 'unknown' else level != 'none', 'intensity': level}
    meal_labels = json.loads(row['taxonomy_meal_slots_json'])
    return {'cuisineCodes':[reverse[x] for x in json.loads(row['taxonomy_cuisines_json']) if x != 'unknown'],
            'origin':{'Bắc':'north','Trung':'central','Nam':'south','unknown':'unknown','not_applicable':'not_applicable'}[row['taxonomy_origin']],
            'categoryCodes':categories,
            'temperature':{'nóng':'hot','ấm':'warm','lạnh':'cold','nhiệt độ thường':'ambient','unknown':'unknown'}[row['taxonomy_temperature']],
            'flavor':flavors,
            'mealSlots':[code for label, code in [('sáng','breakfast'),('trưa','lunch'),('tối','dinner')] if label in meal_labels],
            'timeHints':['late_night'] if 'khuya' in meal_labels else [],
            'evidence':json.loads(row['taxonomy_evidence_json']), 'status':'draft'}

def build(rows, rules, registry):
    sources = {r['dish_id']:r for r in rows}
    if len(sources) != len(rows):
        raise ValueError('Duplicate source dish ID')
    mappings = rules['mapping']
    if len({m['sourceDishId'] for m in mappings}) != len(mappings) or set(sources) != {m['sourceDishId'] for m in mappings}:
        raise ValueError('Source IDs changed: explicit owner mapping required')
    bases = {r['id']:r for r in registry['dishes']}
    if len(bases) != len(registry['dishes']):
        raise ValueError('Duplicate base dish ID')
    for b in bases.values():
        if b['id'] != stable_id('dishes', b['registryKey']):
            raise ValueError('Registry ID does not match immutable key')
    result = []
    for m in mappings:
        if sources[m['sourceDishId']]['dish_name'] != m['sourceName']:
            raise ValueError('Source renamed: explicit mapping review required')
        if m['status'] not in ['mapped','needs_review','excluded']:
            raise ValueError('Invalid mapping state')
        if (m['status']=='mapped') != (m['baseDishId'] in bases):
            raise ValueError('Mapping target/state mismatch')
    for base_id, b in bases.items():
        members = [sources[m['sourceDishId']] for m in mappings if m['status']=='mapped' and m['baseDishId']==base_id]
        if not members:
            raise ValueError('Registry base without source')
        profiles = [{'sourceDishId':r['dish_id'],'profile':convert_profile(r)} for r in members]
        # Keep proposals on their source context, never propagate a model guess to every venue.
        offerings = {}
        for r in members:
            for o in json.loads(r['menu_offerings_json']):
                key = o['menu_item_id']
                if key in offerings and offerings[key] != o:
                    raise ValueError('Conflicting source offering metadata')
                offerings[key] = o
        result.append({'id':base_id,'version':b['version'],'name':b['name'],'aliases':[], 'status':'draft',
                       'sourceDishIds':[r['dish_id'] for r in members], 'sourceNames':[r['dish_name'] for r in members],
                       'sourceNameCount':len(members), 'menuItemCount':len(offerings),
                       'searchQueries':[b['name']], 'temperature':'unknown','origin':'unknown','flavor':None,'mealSlots':[],
                       'classificationStatus':'needs_review', 'sourceProfiles':profiles,
                       'menuOfferings':list(offerings.values())})
    return sorted(result,key=lambda r:r['name']), mappings

def export(rows, mappings, out=BASE/'snapshots'):
    out = Path(out); out.mkdir(parents=True,exist_ok=True)
    write_csv(out/'thu_duc_base_dishes.csv',rows,list(rows[0]))
    write_csv(out/'source_to_base_mapping.csv',mappings,list(mappings[0]))
    for filename, data in [('thu_duc_base_dishes.csv',rows), ('source_to_base_mapping.csv',mappings)]:
        back=read_csv(out/filename)
        expected=[{k:json.dumps(v,ensure_ascii=False,separators=(',', ':')) if isinstance(v,(list,dict)) else '' if v is None else str(v) for k,v in r.items()} for r in data]
        if back!=expected:raise ValueError('CSV roundtrip changed values')
    stats={'sourceRows':len(mappings),'baseDishes':len(rows),'mappingStates':dict(Counter(m['status'] for m in mappings)),
           'apiCalls':0,'status':'draft','contractVersion':'1.0.0','engine':'Python exec; no Jupyter kernel'}
    stats['files']={p.name:{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p in sorted(out.glob('*.csv'))}
    (out/'manifest.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2)+'\n')
    return stats

if __name__=='__main__':
    rows=read_csv(BASE/'snapshots/thu_duc_dishes_taxonomy.csv')
    results,mappings=build(rows,load_json(BASE/'config/base_dish_mapping_v1.json'),load_json(BASE/'config/base_dish_registry.json'))
    print(json.dumps(export(results,mappings),ensure_ascii=False,indent=2))
