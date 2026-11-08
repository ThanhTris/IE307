"""Strict SQL NULL/JSON price/card/terminal regressions for the private GM06 model."""
from copy import deepcopy
import json


def exercise(query, rejects, result_sql, locked, typed):
    valid={'amount':0,'currency':None,'unit':None,'sourceRef':None,'servingSize':None,'observedAt':'2026-10-27T00:00:00Z'}
    query('price SQL NULL returns false', 'select gm06_canonical.valid_price(null) is false;')
    query('unknown price JSON null returns true', "select gm06_canonical.valid_price('null'::jsonb) is true;")
    query('complete zero price with nullable metadata returns true', 'select gm06_canonical.valid_price('+typed(valid)+') is true;')
    query('complete null amount remains a valid unknown observation', 'select gm06_canonical.valid_price('+typed({**valid,'amount':None})+') is true;')
    query('card SQL NULL returns false','select gm06_canonical.valid_card(null) is false;')
    query('card empty object returns false',"select gm06_canonical.valid_card('{}'::jsonb) is false;")
    query('preference SQL NULLs return false', 'select gm06_canonical.valid_preferences(null,null,null,null,null) is false;')
    def json_value(value):
        return "'"+json.dumps(value).replace("'","''")+"'::jsonb"
    malformed=[('empty object',{}),('array',[]),('string','price'),('number',35000),('boolean',True),('extra field',{**valid,'raw':'forbidden'}),('negative amount',{**valid,'amount':-1}),('invalid timestamp',{**valid,'observedAt':'not a date'})]
    wrong={'amount':'35000','currency':35000,'unit':[],'sourceRef':{},'servingSize':False,'observedAt':None}
    for key in valid:
        missing=deepcopy(valid);missing.pop(key)
        malformed.append(('missing '+key,missing))
        malformed.append(('wrong type '+key,{**valid,key:wrong[key]}))
    for label,price in malformed:
        query('price '+label+' strictly rejected','select gm06_canonical.valid_price('+json_value(price)+') is false;')
        card={**locked[0],'priceReference':price}
        query('nested card '+label+' strictly rejected','select gm06_canonical.valid_card('+typed(card)+') is false;')
        pool=[card,*locked[1:]]
        query('terminal pool '+label+' strictly rejected','select gm06_canonical.valid_terminal('+typed(pool)+",'[]',null,'NO_CONSENSUS','EMPTY_INTERSECTION',1,1) is false;")
        rejects('storage CHECK rejects price '+label,result_sql({'locked_pool':pool}))
    query('JSON null price remains valid in terminal pool', 'select gm06_canonical.valid_terminal('+typed(locked)+",'[]',null,'NO_CONSENSUS','EMPTY_INTERSECTION',1,1) is true;")
    for field in ('pool','podium','status','reason','round','scored'):
        args={'pool':typed(locked),'podium':"'[]'::jsonb",'status':"'NO_CONSENSUS'",'reason':"'EMPTY_INTERSECTION'",'round':'1','scored':'1'}
        args[field]='null'
        query('terminal SQL NULL '+field+' returns false','select gm06_canonical.valid_terminal('+args['pool']+','+args['podium']+',null,'+args['status']+','+args['reason']+','+args['round']+','+args['scored']+') is false;')
    for bad in ({},[{}]):
        query('empty podium object cannot bypass exact key guard','select gm06_canonical.valid_terminal('+typed(locked)+','+typed(bad)+','+typed(locked[0]['dishId'])+",'DECIDED','UNANIMOUS_WANT',1,1) is false;")
