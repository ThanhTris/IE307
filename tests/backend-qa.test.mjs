import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALTERNATE_QA_PORTS, DEFAULT_QA_PORTS, assertOwnedResource, assertOwnedVolume,
  assertLoopbackPublishedPort, canonicalJson, makeNames, parseArgs, runTrackedStep, validatePorts, validateRunId,
  workerProcessMatches,
} from '../scripts/backend-qa.mjs';

test('run ids are safe path and resource-name segments', () => {
  assert.equal(validateRunId('gm03-check-01'), 'gm03-check-01');
  for (const value of ['../app', 'two words', 'Upper', 'a_b', '', 'a'.repeat(32)]) assert.throws(() => validateRunId(value));
  assert.deepEqual(makeNames('gm03-check'), {
    projectId: 'gm03qa-gm03-check', networkName: 'gm03-qa-gm03-check',
    containerName: 'supabase_db_gm03qa-gm03-check', volumeName: 'supabase_db_gm03qa-gm03-check',
  });
});

test('QA ports are isolated from app ports and allow the planned alternate pair', () => {
  assert.deepEqual(validatePorts(DEFAULT_QA_PORTS.api, DEFAULT_QA_PORTS.db), DEFAULT_QA_PORTS);
  assert.deepEqual(validatePorts(ALTERNATE_QA_PORTS.api, ALTERNATE_QA_PORTS.db), ALTERNATE_QA_PORTS);
  assert.throws(() => validatePorts(54321, 54372), /QA_APP_PORT_FORBIDDEN/);
  assert.throws(() => validatePorts(54371, 54371), /QA_PORTS_INVALID/);
  assert.throws(() => validatePorts(80, 54372), /QA_PORTS_INVALID/);
});

test('CLI requires explicit run id and rejects unknown flags', () => {
  assert.deepEqual(parseArgs(['start', '--run-id', 'demo-1', '--api-port', '54371', '--db-port', '54372']).ports, { api: 54371, db: 54372 });
  assert.equal(parseArgs(['worker-start', '--run-id', 'demo-1']).operation, 'worker-start');
  assert.equal(parseArgs(['worker-stop', '--run-id', 'demo-1']).operation, 'worker-stop');
  assert.throws(() => parseArgs(['verify']), /QA_RUN_ID_REQUIRED/);
  assert.throws(() => parseArgs(['start', '--run-id', '../app']), /QA_RUN_ID_INVALID/);
  assert.throws(() => parseArgs(['status', '--run-id', 'demo', '--all']), /QA_ARGUMENT_INVALID/);
});

test('resource ownership checks require exact project, name, and workdir labels', () => {
  const container = { Name: '/supabase_db_gm03qa-run-1', Config: { Labels: {
    'com.supabase.cli.project': 'gm03qa-run-1', 'com.supabase.cli.workdir': 'C:/work/.work/qa/run-1',
  } } };
  assert.equal(assertOwnedResource(container, { name: 'supabase_db_gm03qa-run-1', projectId: 'gm03qa-run-1', workdir: 'C:\\work\\.work\\qa\\run-1' }), true);
  assert.throws(() => assertOwnedResource(container, { name: 'supabase_db_other', projectId: 'gm03qa-run-1', workdir: 'C:/work/.work/qa/run-1' }), /OWNERSHIP/);
  assert.throws(() => assertOwnedResource(container, { name: 'supabase_db_gm03qa-run-1', projectId: 'other', workdir: 'C:/work/.work/qa/run-1' }), /OWNERSHIP/);
  assert.throws(() => assertOwnedResource(container, { name: 'supabase_db_gm03qa-run-1', projectId: 'gm03qa-run-1', workdir: 'C:/other' }), /OWNERSHIP/);
});

test('volumes need both Supabase and Compose project labels', () => {
  const volume = { Name: 'supabase_db_gm03qa-run-1', Labels: {
    'com.supabase.cli.project': 'gm03qa-run-1', 'com.docker.compose.project': 'gm03qa-run-1',
  } };
  assert.equal(assertOwnedVolume(volume, { name: volume.Name, projectId: 'gm03qa-run-1' }), true);
  assert.throws(() => assertOwnedVolume({ ...volume, Labels: {} }, { name: volume.Name, projectId: 'gm03qa-run-1' }), /OWNERSHIP/);
});

test('published QA ports must be bound only to loopback interfaces', () => {
  const api = { NetworkSettings: { Ports: { '8000/tcp': [{ HostIp: '127.0.0.1', HostPort: '54361' }] } } };
  const database = { NetworkSettings: { Ports: { '5432/tcp': [{ HostIp: '::1', HostPort: '54362' }] } } };
  assert.equal(assertLoopbackPublishedPort(api, '8000', 54361), true);
  assert.equal(assertLoopbackPublishedPort(database, '5432', 54362), true);
  for (const hostIp of ['', '0.0.0.0', '::']) {
    assert.throws(() => assertLoopbackPublishedPort({ NetworkSettings: { Ports: {
      '8000/tcp': [{ HostIp: hostIp, HostPort: '54361' }],
    } } }, '8000', 54361), /QA_HOST_BINDING_NOT_LOOPBACK/);
  }
  assert.throws(() => assertLoopbackPublishedPort(api, '8000', 54360), /QA_HOST_BINDING_NOT_LOOPBACK/);
});

test('manifest canonicalization is independent of object key order', () => {
  assert.equal(canonicalJson({ b: 2, a: { y: 1, x: 0 } }), canonicalJson({ a: { x: 0, y: 1 }, b: 2 }));
});

test('worker termination only accepts the run-scoped owned process nonce', () => {
  const command = 'python.exe scripts/dish_policy_worker.py --qa-manifest .work/qa/run-1/manifest.json --worker-nonce abc-123';
  assert.equal(workerProcessMatches(command, 'scripts/dish_policy_worker.py', 'abc-123'), true);
  assert.equal(workerProcessMatches(command, 'scripts/other.py', 'abc-123'), false);
  assert.equal(workerProcessMatches(command, 'scripts/dish_policy_worker.py', 'other'), false);
  assert.equal(workerProcessMatches('', 'scripts/dish_policy_worker.py', 'abc-123'), false);
});

test('failed cleanup step stays retryable and does not record false completion', async () => {
  const state = { cleanup: { completed: ['worker'] } };
  let attempts = 0;
  await assert.rejects(runTrackedStep(state, 'supabase', async () => {
    attempts += 1;
    throw new Error('gateway already stopped but volume cleanup failed');
  }), /gateway already stopped/);
  assert.deepEqual(state.cleanup.completed, ['worker']);
  await runTrackedStep(state, 'supabase', async () => { attempts += 1; });
  assert.equal(attempts, 2);
  assert.deepEqual(state.cleanup.completed, ['worker', 'supabase']);
  let duplicateCalls = 0;
  assert.equal(await runTrackedStep(state, 'supabase', async () => { duplicateCalls += 1; }), false);
  assert.equal(duplicateCalls, 0);
});
