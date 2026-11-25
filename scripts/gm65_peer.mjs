// QA-only second player who hosts a room, so the AVD can join as a member and see it close.
// node scripts/gm65_peer.mjs <qaRunId> create|cancel   (state stays in the ignored .work/ folder)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

const [runId, command] = process.argv.slice(2);
if (!runId || !['create', 'cancel'].includes(command)) {
  console.error('Usage: node scripts/gm65_peer.mjs <qaRunId> create|cancel');
  process.exit(2);
}
const credentials = JSON.parse(readFileSync(join('.work', 'qa', runId, 'credentials.private.json'), 'utf8'));
const { apiUrl, anonKey } = credentials;
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(apiUrl)) throw new Error('GM65_PEER_LOOPBACK_ONLY');
const stateFile = join('.work', 'gm65', `peer-${runId}.private.json`);
const contractVersion = 'dish-session-v4/roadmap-v2/GM-07.B-supplement';
const requestId = prefix => `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;

async function rpc(token, name, args) {
  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/rest/v1/rpc/dish_session`, {
    method: 'POST',
    headers: { apikey: anonKey, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ command: name, payload: { contractVersion, ...args } }),
  });
  const body = await response.json();
  if (!body.ok) throw new Error(`${name} failed: ${body.error?.messageKey ?? body.messageKey ?? response.status}`);
  return body.data;
}

if (command === 'create') {
  const signup = await fetch(`${apiUrl.replace(/\/$/, '')}/auth/v1/signup`, {
    method: 'POST', headers: { apikey: anonKey, 'content-type': 'application/json' },
    body: JSON.stringify({ data: { display_name: 'Chu phong QA' } }),
  });
  const { access_token: token } = await signup.json();
  if (!token) throw new Error('signup failed');
  const room = await rpc(token, 'create', {
    requestId: requestId('create'), displayName: 'Chu phong QA',
    settings: { dishCount: 10, mealSlot: 'lunch', desiredAt: null },
    preferences: { cuisineIds: [], categoryIds: [], temperature: null, flavor: null, budget: null, avoidRecent: false },
  });
  mkdirSync(join('.work', 'gm65'), { recursive: true });
  writeFileSync(stateFile, JSON.stringify({ token, roomId: room.roomId, code: room.code }));
  console.log(`room code ${room.code}`);
} else {
  if (!existsSync(stateFile)) throw new Error('create a room first');
  const state = JSON.parse(readFileSync(stateFile, 'utf8'));
  const snapshot = await rpc(state.token, 'snapshot', { roomId: state.roomId });
  await rpc(state.token, 'cancel', {
    requestId: requestId('cancel'), roomId: state.roomId, expectedVersion: snapshot.version,
  });
  console.log('room cancelled');
}
