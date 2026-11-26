// QA-only second player who hosts a room, so the AVD can join as a member and see it close.
// node scripts/gm65_peer.mjs <qaRunId> create|cancel   (state stays in the ignored .work/ folder)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

const [runId, command, arg1, arg2] = process.argv.slice(2);
const VALID = ['create', 'cancel', 'kick', 'start', 'vote1', 'vote2', 'waiting', 'finalize', 'snapshot', 'invite', 'friend-setup'];
if (!runId || !VALID.includes(command)) {
  console.error(`Usage: node scripts/gm65_peer.mjs <qaRunId> <${VALID.join('|')}> [args...]`);
  process.exit(2);
}
const credentials = JSON.parse(readFileSync(join('.work', 'qa', runId, 'credentials.private.json'), 'utf8'));
const { apiUrl, anonKey, mailUrl } = credentials;
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(apiUrl)) throw new Error('GM65_PEER_LOOPBACK_ONLY');
const stateFile = join('.work', 'gm65', `peer-${runId}.private.json`);
const contractVersion = 'dish-session-v4/roadmap-v2/GM-07.B-supplement';
const requestId = prefix => `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;

async function postRpc(token, fnName, body) {
  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: { apikey: anonKey, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (json && json.ok === false) throw new Error(`${fnName} failed: ${json.error?.messageKey ?? json.messageKey ?? response.status}`);
  if (!response.ok) throw new Error(`${fnName} HTTP ${response.status}`);
  return json?.data !== undefined && json?.ok === true ? json.data : json;
}

async function rpc(token, name, args) {
  return postRpc(token, 'dish_session', { command: name, payload: { contractVersion, ...args } });
}

if (command === 'create') {
  const signup = await fetch(`${apiUrl.replace(/\/$/, '')}/auth/v1/signup`, {
    method: 'POST', headers: { apikey: anonKey, 'content-type': 'application/json' },
    body: JSON.stringify({ data: { display_name: 'Chu phong QA' } }),
  });
  const { access_token: token, user } = await signup.json();
  if (!token) throw new Error('signup failed');
  const room = await rpc(token, 'create', {
    requestId: requestId('create'), displayName: 'Chu phong QA',
    settings: { dishCount: 10, mealSlot: 'lunch', desiredAt: null },
    preferences: { cuisineIds: [], categoryIds: [], temperature: null, flavor: null, budget: null, avoidRecent: false },
  });
  mkdirSync(join('.work', 'gm65'), { recursive: true });
  writeFileSync(stateFile, JSON.stringify({ token, userId: user?.id, roomId: room.roomId, code: room.code }));
  console.log(`room code ${room.code}`);
} else if (command === 'friend-setup') {
  // Usage: friend-setup <peerEmail> <peerPass> <targetFriendCode> [targetEmail]
  const email = arg1 || `peer_${Date.now()}@example.test`;
  const password = arg2 || 'Pass12345!';
  const targetFriendCode = process.argv[6];
  const signup = await fetch(`${apiUrl.replace(/\/$/, '')}/auth/v1/signup`, {
    method: 'POST', headers: { apikey: anonKey, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, data: { display_name: 'Ban QA' } }),
  });
  const sJson = await signup.json();
  let token = sJson.access_token;
  if (!token && mailUrl) {
    await new Promise(r => setTimeout(r, 800));
    const mailRes = await fetch(`${mailUrl.replace(/\/$/, '')}/api/v1/messages`);
    const mailData = await mailRes.json().catch(() => ({}));
    const list = mailData.messages ?? mailData ?? [];
    for (const m of list) {
      const id = m.ID ?? m.id;
      const msgRes = await fetch(`${mailUrl.replace(/\/$/, '')}/api/v1/message/${id}`).catch(() => null);
      const txt = msgRes ? await msgRes.text() : JSON.stringify(m);
      const match = txt.match(/(\d{6})/);
      if (match) {
        const vRes = await fetch(`${apiUrl.replace(/\/$/, '')}/auth/v1/verify`, {
          method: 'POST', headers: { apikey: anonKey, 'content-type': 'application/json' },
          body: JSON.stringify({ type: 'signup', email, token: match[1] }),
        });
        const vJson = await vRes.json().catch(() => ({}));
        if (vJson.access_token) { token = vJson.access_token; break; }
      }
    }
  }
  if (!token) throw new Error('peer email verify failed');
  let inviteRes = null;
  if (targetFriendCode) {
    inviteRes = await postRpc(token, 'invite_partner', { requestId: requestId('fp'), friend_code: targetFriendCode, partner_id: null });
  }
  console.log(JSON.stringify({ email, token: '[REDACTED]', userId: sJson.user?.id, invited: Boolean(inviteRes) }));
} else {
  if (!existsSync(stateFile)) throw new Error('create a room first');
  const state = JSON.parse(readFileSync(stateFile, 'utf8'));
  const snapshot = await rpc(state.token, 'snapshot', { roomId: state.roomId });
  if (command === 'snapshot') {
    console.log(JSON.stringify({ state: snapshot.state, version: snapshot.version, round: snapshot.round, memberCount: snapshot.members?.length, dishCount: snapshot.pool?.length, code: snapshot.code }));
  } else if (command === 'cancel') {
    await rpc(state.token, 'cancel', { requestId: requestId('cancel'), roomId: state.roomId, expectedVersion: snapshot.version });
    console.log('room cancelled');
  } else if (command === 'kick') {
    const member = snapshot.members?.find(m => m.userId !== snapshot.hostUserId);
    if (!member) throw new Error('no non-host member to kick');
    await postRpc(state.token, 'remove_room_member', {
      requestId: requestId('kick'), room_ref: state.roomId, member_ref: member.userId, expected_version: snapshot.version,
    });
    console.log(`kicked ${member.userId}`);
  } else if (command === 'start') {
    await rpc(state.token, 'start', { requestId: requestId('start'), roomId: state.roomId, expectedVersion: snapshot.version });
    console.log('round 1 started');
  } else if (command === 'vote1') {
    const mode = arg1 || 'ok'; // 'ok' -> advances to R2 when paired with OK/NO, 'no_all' -> EMPTY_INTERSECTION, 'want_all' -> immediate R1 win
    const votes = (snapshot.pool ?? []).map((d, idx) => ({
      roundDishId: d.roundDishId,
      choice: mode === 'no_all' ? 'NO' : mode === 'want_all' ? 'WANT' : idx < 4 ? 'OK' : 'NO',
    }));
    const res = await rpc(state.token, 'submit', {
      requestId: requestId('v1'), roomId: state.roomId, round: 1, poolVersion: snapshot.poolVersion ?? 1, expectedVersion: snapshot.version, votes,
    });
    console.log('vote1 submitted', JSON.stringify(res));
  } else if (command === 'vote2') {
    const mode = arg1 || 'keep'; // 'keep' or 'remove_first'
    const votes = (snapshot.pool ?? []).map((d, idx) => ({
      roundDishId: d.roundDishId,
      choice: mode === 'remove_first' && idx === 0 ? 'REMOVE' : 'KEEP',
    }));
    const res = await rpc(state.token, 'submit', {
      requestId: requestId('v2'), roomId: state.roomId, round: 2, poolVersion: snapshot.poolVersion ?? 1, expectedVersion: snapshot.version, votes,
    });
    console.log('vote2 submitted', JSON.stringify(res));
  } else if (command === 'waiting') {
    const res = await rpc(state.token, 'waiting', {
      requestId: requestId('wait'), roomId: state.roomId, round: Number(arg1 || snapshot.round || 1), poolVersion: snapshot.poolVersion ?? 1, expectedVersion: snapshot.version,
    });
    console.log('waiting entered', JSON.stringify(res));
  } else if (command === 'finalize') {
    const res = await rpc(state.token, 'finalize', {
      requestId: requestId('fin'), roomId: state.roomId, expectedVersion: snapshot.version,
    });
    console.log('finalized', JSON.stringify(res));
  } else if (command === 'invite') {
    const res = await postRpc(state.token, 'invite_to_room', { requestId: requestId('inv'), room_id: state.roomId, partner_id: arg1, expected_version: snapshot.version });
    console.log('invited', JSON.stringify(res));
  }
}
