"""Build the GM18.2 read contract, reusing the received immutable B card types."""
import argparse
from copy import deepcopy
import json
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'docs/architecture/schemas/gm18-dish-catalogue.schema.json'


def build():
    base=json.loads((ROOT/'docs/architecture/schemas/dish-session-v4b.schema.json').read_text())['$defs']
    defs={}
    def include(names):
        pending=list(names)
        while pending:
            name=pending.pop()
            if name in defs:continue
            defs[name]=deepcopy(base[name])
            pending.extend(re.findall(r'#/\$defs/([A-Za-z0-9_]+)',json.dumps(defs[name])))
    include(['poolDish','softPreferences'])
    card=defs.pop('poolDish');card['required'].remove('roundDishId');card['properties'].pop('roundDishId')
    term={'type':'object','required':['id','type','code','label','version'],'properties':{'id':{'type':'string','format':'uuid'},'type':{'enum':['cuisine','category']},'code':{'type':'string'},'label':{'type':'string'},'version':{'type':'integer','minimum':1}},'additionalProperties':False}
    observation={'type':'object','required':['amount','currency','unit','sourceRef','servingSize','observedAt'],'properties':{'amount':{'type':['number','null'],'minimum':0},'currency':{'type':['string','null'],'pattern':'^[A-Z]{3}$'},'unit':{'enum':['portion','item','person','group','kg','menu_item_unspecified',None]},'sourceRef':{'type':['string','null'],'maxLength':500},'servingSize':{'type':['string','null'],'maxLength':160},'observedAt':{'type':'string','format':'date-time'}},'additionalProperties':False}
    card['properties'].update({'priceObservation':{'oneOf':[{'type':'null'},observation]},'cuisineTerms':{'type':'array','items':term},'categoryTerms':{'type':'array','items':term},'taxonomyVersion':{'type':['string','null']}})
    card['required']+=['priceObservation','cuisineTerms','categoryTerms','taxonomyVersion'];defs['card']=card
    version={'const':'dish-catalogue/roadmap-v2/GM-18.2'};meal={'enum':['breakfast','lunch','dinner','snack']}
    for name,preview in [('catalogueRequest',False),('previewRequest',True)]:
        props={'contractVersion':version,'mealSlot':meal}
        if preview:props.update({'dishCount':{'type':'integer','minimum':10,'maximum':20},'preferences':{'$ref':'#/$defs/softPreferences'}})
        defs[name]={'type':'object','required':['payload'],'properties':{'payload':{'type':'object','required':['contractVersion']+(['mealSlot','dishCount'] if preview else []),'properties':props,'additionalProperties':False}},'additionalProperties':False}
    props={'contractVersion':version,'projectionVersion':{'const':'GM18.2'},'catalogueVersion':{'type':'string'},'catalogueSha':{'type':'string','pattern':'^[a-f0-9]{64}$'},'testOnly':{'type':'boolean'},'mealSlot':{'enum':meal['enum']+[None]},'available':{'type':'integer','minimum':0,'maximum':1000},'requested':{'type':['integer','null'],'minimum':10,'maximum':20},'previewOnly':{'type':'boolean'},'preferenceRanking':{'const':'UNSUPPORTED'},'dishes':{'type':'array','maxItems':1000,'items':{'$ref':'#/$defs/card'}}}
    defs['success']={'type':'object','required':['ok','data'],'properties':{'ok':{'const':True},'data':{'type':'object','required':list(props),'properties':props,'additionalProperties':False}},'additionalProperties':False}
    defs['error']={'type':'object','required':['ok','error'],'properties':{'ok':{'const':False},'error':{'type':'object','required':['messageKey','details'],'properties':{'messageKey':{'enum':['AUTH_REQUIRED','RATE_LIMITED','INVALID_INPUT','UNSUPPORTED_CONTRACT_VERSION','UNSUPPORTED_FIELD','CATALOGUE_NOT_READY','INSUFFICIENT_DISHES']},'details':{'type':'object'}},'additionalProperties':False}},'additionalProperties':False}
    return {'$schema':'https://json-schema.org/draft/2020-12/schema','$id':'https://gi-cung-duoc.local/schemas/gm18-dish-catalogue.schema.json','title':'GM18.2 additive dish catalogue/preview contract, review Pending','oneOf':[{'$ref':'#/$defs/success'},{'$ref':'#/$defs/error'}],'$defs':defs}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--write',action='store_true');args=parser.parse_args()
    rendered=json.dumps(build(),ensure_ascii=False,indent=2)+'\n'
    if args.write:OUTPUT.write_text(rendered,encoding='utf-8')
    elif not OUTPUT.exists() or OUTPUT.read_text()!=rendered:raise SystemExit('Stale GM18 schema; run build_gm18_contract.py --write')
    print('GM18.2 contract matches received B card types.')
