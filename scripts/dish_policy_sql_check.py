#!/usr/bin/env python3
"""ADR-019 actual PostgreSQL regression; creates/removes only a namespace-owned DB."""
import hashlib
import base64
import hmac
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import os
import time
import threading
from urllib import request as http_request, error as http_error
from urllib.parse import urlsplit, urlunsplit
import uuid
from concurrent.futures import ThreadPoolExecutor
from dish_policy_worker import verify as verify_worker

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("food_import", ROOT / "supabase/seed/import_food_data.py")
food = importlib.util.module_from_spec(spec)
spec.loader.exec_module(food)


def diagnostic(args, sql=None):
    args = ["VERBOSITY=verbose" if a == "VERBOSITY=sqlstate" else a for a in args]
    p = subprocess.run(args, input=sql, text=True, encoding="utf-8", capture_output=True, timeout=180)
    if p.returncode:
        # Only this disposable suite's SQL; never serialize JWT/key/environment.
        raise RuntimeError(p.stderr[-2400:])
    return p.stdout


def run():
    food.LocalDB.run = staticmethod(diagnostic)
    admin = food.LocalDB()
    namespace = uuid.uuid4()
    name = "gm08_check_" + namespace.hex[:16]
    db = None
    rest_container = None
    worker_stop=threading.Event()
    worker_thread=None
    worker_errors=[]
    cases = []
    users = [str(uuid.uuid5(namespace, "user-" + str(i))) for i in range(22)]
    def check(label, condition):
        if not condition:
            raise AssertionError(label)
        cases.append(label)

    def call(command, payload, who=0):
        sql = "begin;set local role authenticated;select set_config('request.jwt.claim.sub'," + food.literal(users[who]) + ",true);select public.dish_session(" + food.literal(command) + "," + food.literal(json.dumps(payload)) + "::jsonb);commit;"
        lines = db.psql(sql).strip().splitlines()
        return json.loads(next(s for s in reversed(lines) if s.startswith("{")))

    def write(command, room=None, who=0, **payload):
        if command=="create": payload.setdefault("mealSlot","dinner")
        if room:
            payload.update(roomId=room["roomId"], expectedVersion=room["version"])
        payload.setdefault("requestId", str(uuid.uuid4()))
        return call(command, payload, who)

    def snapshot(room, who=0):
        response = call("snapshot", {"roomId": room["roomId"]}, who)
        check("snapshot member", response["ok"])
        return response["data"]

    try:
        ddl = admin.run(["docker", "exec", food.CONTAINER, "pg_dump", "-U", "postgres", "-d", "postgres", "--schema-only", "--no-owner", "--no-privileges", "-t", "auth.users"])
        ddl = "\n".join(line for line in ddl.splitlines() if not re.match(r"CREATE (?:CONSTRAINT )?TRIGGER gm\d+_", line))
        uid = admin.psql("select pg_get_functiondef('auth.uid()'::regprocedure);")
        admin.psql("create database " + name + " template template0;")
        db = food.LocalDB(name)
        db.psql("create table public.dish_v3_test_owner(namespace uuid primary key);insert into public.dish_v3_test_owner values('" + str(namespace) + "');")
        db.psql("create schema auth;\n" + ddl + "\n" + uid + ";grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;")
        for path in sorted((ROOT / "supabase/migrations").glob("*.sql")):
            db.psql(path.read_text(encoding="utf-8"))
        verify_worker(db)
        check("worker verifies deployed code and schema",True)
        for u in users:
            db.psql("insert into auth.users(id,is_anonymous) values('" + u + "',true);")
        cards = [{"dishId": str(uuid.uuid5(namespace, "dish-" + str(i))), "name": "Synthetic dish " + str(i), "description": None, "artwork": None,
          "mealSlots":["dinner"],"cuisineIds":[],"categoryIds":[]} for i in range(20)]
        check("catalogue rejects duplicate IDs", db.psql("select dish_v3_private.valid_catalogue("+food.literal(json.dumps(cards+[cards[0]]))+"::jsonb);").strip()=="f")
        invalid_card={**cards[0],"mealSlots":["midnight"]}
        check("catalogue rejects unknown meal",db.psql("select dish_v3_private.valid_catalogue("+food.literal(json.dumps([invalid_card]))+"::jsonb);").strip()=="f")
        db.psql("insert into dish_v3_private.catalogues(id,source_sha,cards,test_only,active) values('test-only-v3','" + hashlib.sha256(str(namespace).encode()).hexdigest() + "'," + food.literal(json.dumps(cards)) + "::jsonb,true,true);")
        try: db.psql("update dish_v3_private.catalogues set source_sha=repeat('1',64);")
        except RuntimeError as exc: check("catalogue release is frozen","CATALOGUE_RELEASE_IMMUTABLE" in str(exc))
        else: check("catalogue release is frozen",False)
        check("cannot create without worker",write("create",displayName="Host",dishCount=10)["error"]["messageKey"]=="WORKER_NOT_READY")
        def worker():
            while not worker_stop.is_set():
                try: db.psql("select dish_v3_private.tick();")
                except Exception as exc:
                    worker_errors.append(type(exc).__name__)
                    return
                worker_stop.wait(0.5)
        db.psql("select dish_v3_private.tick();")
        worker_thread=threading.Thread(target=worker,daemon=True)
        worker_thread.start()
        for n in [9, 21, 10.5, None, "10"]:
            r = write("create", displayName="Host", dishCount=n)
            check("invalid count " + str(n), not r["ok"])
        for n in range(10, 21):
            r = write("create", who=n-10, displayName="Host", dishCount=n)
            check("exact pool " + str(n), r["ok"] and len(r["data"]["pool"]) == n)
        db.psql("delete from gm19_private.rate_windows where operation='dish_session_create';")
        # Count remains explicit: never silently truncate a host's requested pool.
        db.psql("update dish_v3_private.catalogues set active=false;insert into dish_v3_private.catalogues(id,source_sha,cards,test_only,active) select 'short-fixture',source_sha,(select jsonb_agg(value) from jsonb_array_elements(cards) with ordinality d(value,n) where n<=15),true,true from dish_v3_private.catalogues where id='test-only-v3';")
        shortage=write("create",displayName="Host",dishCount=20)
        check("insufficient count rejected", shortage["error"]["messageKey"]=="INSUFFICIENT_DISHES")
        db.psql("update dish_v3_private.catalogues set active=false;update dish_v3_private.catalogues set active=true where id='test-only-v3';")
        check("meal filter never silently relaxed",write("create",displayName="Host",dishCount=10,mealSlot="breakfast")["error"]["messageKey"]=="INSUFFICIENT_DISHES")
        check("unknown meal rejected",write("create",displayName="Host",dishCount=10,mealSlot="midnight")["error"]["messageKey"]=="INVALID_INPUT")
        request_id = str(uuid.uuid4())
        create = write("create", displayName="Host", dishCount=10, requestId=request_id)
        check("create", create["ok"])
        room = create["data"]
        check("no place prerequisite", len(room["pool"]) == 10 and room["maxMembers"] == 20)
        replay = write("create", displayName="Host", dishCount=10, requestId=request_id)
        check("create replay exact", replay == create)
        conflict = write("create", displayName="Host", dishCount=20, requestId=request_id)
        check("id reuse rejected", conflict["error"]["messageKey"] == "REQUEST_ID_REUSED")
        check("outsider hidden", call("snapshot", {"roomId": room["roomId"]}, 21)["error"]["messageKey"] == "NOT_MEMBER")
        for u in range(1, 20):
            r = write("join", who=u, code=room["code"], displayName="Member " + str(u))
            check("join " + str(u + 1), r["ok"])
        check("21st member rejected", write("join", who=20, code=room["code"], displayName="Overflow")["error"]["messageKey"] == "ROOM_FULL")
        race_room=write("create",displayName="Race host",dishCount=10)["data"]
        for who in range(1,19):
            assert write("join",who=who,code=race_room["code"],displayName="Member")["ok"]
        with ThreadPoolExecutor(max_workers=2) as pool:
            joined=list(pool.map(lambda who:write("join",who=who,code=race_room["code"],displayName="Last slot"),[19,20]))
        check("concurrent last slot accepts exactly one",sum(r["ok"] for r in joined)==1
          and next(r for r in joined if not r["ok"])["error"]["messageKey"]=="ROOM_FULL")
        room = snapshot(room)
        check("start no ready", write("start", room)["ok"])
        room = snapshot(room)
        check("no timer at start", room["waitingStartedAt"] is None)
        check("waiting before complete rejected", write("waiting", room, round=1, poolVersion=1)["error"]["messageKey"] == "INCOMPLETE_BALLOT")
        ballots = {d["dishId"]: "OK" for d in room["pool"]}
        submit = write("submit", room, round=1, poolVersion=1, votes=ballots)
        check("complete ballot saved", submit["ok"])
        room = snapshot(room)
        check("submit alone does not start timer", room["waitingStartedAt"] is None)
        waiting = write("waiting", room, round=1, poolVersion=1)
        check("enter waiting starts clock", waiting["ok"] and waiting["data"]["deadline"] is not None)
        first = waiting["data"]["waitingStartedAt"]
        first_version=waiting["data"]["version"]
        again = write("waiting", room, round=1, poolVersion=1)
        check("remount cannot extend", again["data"]["waitingStartedAt"] == first)
        check("remount is not a new mutation",again["data"]["version"]==first_version)
        check("nonhost cannot finalize", write("finalize", snapshot(room, 1), who=1)["error"]["messageKey"] == "NOT_HOST")
        room = snapshot(room)
        check("host early finalize one participant", write("finalize", room)["ok"])
        room = snapshot(room, 1)
        check("missed r1 reconnect r2", room["round"] == 2 and room["ownBallot"] is None and room["waitingStartedAt"] is None)
        removals = {d["dishId"]: "REMOVE" if i < 4 else "KEEP" for i, d in enumerate(room["pool"])}
        check("remove cap enforced", write("submit", room, who=1, round=2, poolVersion=2, votes=removals)["error"]["messageKey"] == "REMOVE_LIMIT")
        ballot2 = {d["dishId"]: "KEEP" for d in room["pool"]}
        check("late member can vote r2", write("submit", room, who=1, round=2, poolVersion=2, votes=ballot2)["ok"])
        waiting2 = write("waiting", room, who=1, round=2, poolVersion=2)
        check("r2 separate timer", waiting2["ok"] and waiting2["data"]["waitingStartedAt"] != first)
        # Move only this test session's stored clock; no application clock/DB mutation.
        db.psql("update dish_v3_private.sessions set waiting_started_at=statement_timestamp()-interval '61 seconds' where room_id='" + room["roomId"] + "';")
        for _ in range(30):
            if db.psql("select state from public.rooms where id='"+room["roomId"]+"';").strip()=="DECIDED": break
            time.sleep(0.2)
        final = snapshot(room)
        check("server worker finalizes without clients", final["state"] == "DECIDED")
        check("stable reconnect result", snapshot(room, 19)["result"] == final["result"])
        seed=db.psql("select seed from dish_v3_private.sessions where room_id='"+room["roomId"]+"';").strip()
        expected=json.loads(diagnostic(["node",str(ROOT/"scripts/evaluate_dish_policy.mjs")],json.dumps({
          "roster":users[:20],"pool":[d["dishId"] for d in room["pool"]],"round":2,
          "round1":{users[0]:ballots},"round2":{users[1]:ballot2},"seed":seed})))
        check("SQL/domain parity including seeded winner",expected["winnerId"]==final["result"]["winner"]["dishId"]
          and expected["tier"]==final["result"]["matchTier"] and expected["reason"]==final["result"]["reasonCode"])
        check("terminal submit rejected", write("submit", final, who=2, round=2, poolVersion=2, votes=ballot2)["error"]["messageKey"] == "ROOM_TERMINAL")
        check("host cannot see another ballot", snapshot(room)["ownBallot"] is None and "votes" not in final["result"])
        # ACL: public RPC is authenticated, private tables have no client privileges.
        for table in ["catalogues", "sessions", "ballots", "acks", "runtime"]:
            check("private ACL " + table, db.psql("select has_table_privilege('authenticated','dish_v3_private." + table + "','select');").strip() == "f")
        check("anon RPC denied", db.psql("select has_function_privilege('anon','public.dish_session(text,jsonb)','execute');").strip() == "f")
        # Three members may each remove one of three remaining dishes.
        extra=write("create",displayName="Host",dishCount=10)["data"]
        for who in [1,2]: check("round2 fixture join",write("join",who=who,code=extra["code"],displayName="Member")["ok"])
        extra=snapshot(extra)
        extra=write("start",extra)["data"]
        r1={d["dishId"]:("NO" if i<7 else "OK") for i,d in enumerate(extra["pool"])}
        check("r1 NO saved",write("submit",extra,round=1,poolVersion=1,votes=r1)["ok"])
        extra=snapshot(extra)
        extra=write("finalize",extra)["data"]
        check("round2 excludes NO dishes",len(extra["pool"])==3 and all(r1[d["dishId"]]!="NO" for d in extra["pool"]))
        for who in range(3):
            remove={d["dishId"]:("REMOVE" if i==who else "KEEP") for i,d in enumerate(extra["pool"])}
            check("per-user remove1 accepted",write("submit",extra,who=who,round=2,poolVersion=2,votes=remove)["ok"])
            check("per-user waiting accepted",write("waiting",extra,who=who,round=2,poolVersion=2)["ok"])
        extra=snapshot(extra)
        check("group can retain ALL_REMOVED",extra["state"]=="NO_CONSENSUS" and extra["result"]["reasonCode"]=="ALL_REMOVED")
        # Real loopback HTTP/PostgREST, signed synthetic identities in this DB.
        # This verifies JWT -> role -> auth.uid -> RPC, not the GoTrue UI/session.
        info=json.loads(admin.run(["docker","inspect","supabase_rest_gi-cung-duoc-local"]))[0]
        env=dict(x.split("=",1) for x in info["Config"]["Env"] if "=" in x)
        secret=env["PGRST_JWT_SECRET"]
        signing_key=secret.encode()
        if secret.startswith("{"):
            symmetric=next((k for k in json.loads(secret).get("keys",[]) if k.get("kty")=="oct" and k.get("k")),None)
            if symmetric is None:
                raise RuntimeError("Local REST has no HS256 test key; do not replace production JWT validation")
            signing_key=base64.urlsafe_b64decode(symmetric["k"]+"="*(-len(symmetric["k"])%4))
        original=urlsplit(env["PGRST_DB_URI"])
        uri=urlunsplit((original.scheme,original.netloc,"/"+name,"",""))
        rest_container="dish-policy-http-"+namespace.hex[:12]
        proc=subprocess.run(["docker","run","--rm","--pull","never","-d","--name",rest_container,
          "--network",next(iter(info["NetworkSettings"]["Networks"])),"-p","127.0.0.1::3000",
          "-e","PGRST_DB_URI","-e","PGRST_JWT_SECRET","-e","PGRST_DB_ANON_ROLE=anon","-e","PGRST_DB_SCHEMAS=public",info["Config"]["Image"]],
          env={**os.environ,"PGRST_DB_URI":uri,"PGRST_JWT_SECRET":secret},capture_output=True,text=True,timeout=30)
        if proc.returncode: raise RuntimeError("Owned PostgREST startup failed")
        binding=json.loads(admin.run(["docker","inspect",rest_container]))[0]["NetworkSettings"]["Ports"]["3000/tcp"][0]
        if binding["HostIp"]!="127.0.0.1": raise RuntimeError("HTTP must stay loopback")
        endpoint="http://127.0.0.1:"+binding["HostPort"]
        for attempt in range(40):
            try:
                http_request.urlopen(endpoint+"/",timeout=2).close()
                break
            except (OSError,http_error.URLError):
                if attempt==39: raise RuntimeError("Owned PostgREST did not become ready")
                time.sleep(0.25)
        def b64(data): return base64.urlsafe_b64encode(data).rstrip(b"=").decode()
        def token(index):
            message=b64(b'{"alg":"HS256","typ":"JWT"}')+"."+b64(json.dumps({"sub":users[index],"role":"authenticated","aud":"authenticated","exp":int(time.time())+600}).encode())
            return message+"."+b64(hmac.new(signing_key,message.encode(),hashlib.sha256).digest())
        def http(command,payload,index=0,authenticated=True):
            headers={"Content-Type":"application/json"}
            if authenticated: headers["Authorization"]="Bearer "+token(index)
            req=http_request.Request(endpoint+"/rpc/dish_session",data=json.dumps({"command":command,"payload":payload}).encode(),headers=headers,method="POST")
            try:
                with http_request.urlopen(req,timeout=10) as response:
                    return response.status,json.load(response)
            except http_error.HTTPError as exc:
                return exc.code,json.load(exc)
        status,value=http("create",{"requestId":str(uuid.uuid4()),"dishCount":20,"displayName":"HTTP Host","mealSlot":"dinner"})
        check("HTTP JWT create exact20",status==200 and value["ok"] and len(value["data"]["pool"])==20)
        http_room=value["data"]
        status,value=http("snapshot",{"roomId":http_room["roomId"]},index=1)
        check("HTTP outsider cannot read",status==200 and value["error"]["messageKey"]=="NOT_MEMBER")
        status,value=http("snapshot",{"roomId":http_room["roomId"]},authenticated=False)
        check("HTTP unauthenticated rejected",status in (401,403))
        status,value=http("join",{"requestId":str(uuid.uuid4()),"code":http_room["code"],"displayName":"HTTP member"},index=1)
        check("HTTP member join",status==200 and value["ok"])
        status,value=http("snapshot",{"roomId":http_room["roomId"]})
        http_room=value["data"]
        status,value=http("start",{"requestId":str(uuid.uuid4()),"roomId":http_room["roomId"],"expectedVersion":http_room["version"]})
        check("HTTP start no ready",status==200 and value["ok"] and value["data"]["waitingStartedAt"] is None)
        http_room=value["data"]
        status,value=http("submit",{"requestId":str(uuid.uuid4()),"roomId":http_room["roomId"],"round":1,"poolVersion":1,"votes":{d["dishId"]:"OK" for d in http_room["pool"]}})
        check("HTTP complete submit does not start clock",status==200 and value["ok"] and value["data"]["waitingStartedAt"] is None)
        status,value=http("waiting",{"requestId":str(uuid.uuid4()),"roomId":http_room["roomId"],"round":1,"poolVersion":1})
        check("HTTP enter waiting starts server clock",status==200 and value["ok"] and value["data"]["deadline"] is not None)
        # Retention wrapper must still clean both policies, including guarded rows.
        db.psql("select set_config('dish_v3.writer','on',false);update public.rooms set expires_at=created_at-interval '2 days',created_at=created_at-interval '3 days',updated_at=statement_timestamp(),version=version+1 where policy_version='dish-decision-v3';select gm17_private.cleanup();")
        check("retention removes new rooms and private ballots",db.psql("select count(*) from dish_v3_private.sessions;").strip()=="0")
        db.psql("create or replace function dish_v3_private.view(room_key uuid) returns jsonb language sql security definer set search_path=pg_catalog as $$ select null::jsonb $$;")
        try: verify_worker(db)
        except RuntimeError: check("worker rejects draft function outside source",True)
        else: check("worker rejects draft function outside source",False)
        check("server worker stayed healthy",not worker_errors)
        print(json.dumps({"result": "Pass", "count": len(cases), "cases": cases, "simulationOnly": True, "applicationDatabaseChanged": False}, ensure_ascii=False))
    finally:
        worker_stop.set()
        if worker_thread: worker_thread.join(timeout=10)
        if rest_container:
            admin.run(["docker","stop",rest_container])
        if db:
            marker = db.psql("select namespace::text from public.dish_v3_test_owner;").strip()
            if marker != str(namespace):
                raise RuntimeError("Cannot verify owned disposable DB for cleanup")
            admin.psql("drop database " + name + " with (force);")


if __name__ == "__main__":
    run()

