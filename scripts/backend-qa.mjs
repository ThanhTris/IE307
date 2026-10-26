import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, lstat, copyFile, open, unlink, readdir, stat } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { redact } from './backend.mjs';

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const qaRoot = resolve(root, '.work', 'qa');
const cli = resolve(root, 'node_modules', 'supabase', 'dist', 'supabase.js');
const realInput = resolve(root, 'supabase', 'seed', 'catalogue', 'dishes.json');
const realSourceManifest = resolve(root, 'supabase', 'seed', 'catalogue', 'manifest.json');
const syntheticFixture = resolve(root, 'supabase', 'tests', 'fixtures', 'gm03-dish-catalogue-synthetic.json');
function brunoPrivatePath(runId) {
  return resolve(root, 'supabase', 'tests', 'bruno', 'GM-03', 'environments', `Local.${validateRunId(runId)}.private.bru`);
}
const allowedSourceFiles = [
  'scripts/backend-qa.mjs', 'scripts/gm03_qa_http_check.mjs', 'scripts/gm_v4_http_check.mjs',
  'scripts/dish_policy_worker.py', 'scripts/gm03_function_inventory.sql', 'scripts/gm40_catalogue_check.py', 'supabase/seed/import_dish_catalogue.py',
  'docs/architecture/DISH_SESSION_API_CONTRACT_B.md', 'docs/architecture/schemas/dish-session-v4b.schema.json',
  'supabase/config.toml', 'supabase/seed/catalogue/dishes.json', 'supabase/seed/catalogue/manifest.json',
  'supabase/tests/fixtures/gm03-dish-catalogue-synthetic.json',
];
const migrationDir = resolve(root, 'supabase', 'migrations');
const pythonEnv = { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' };
const WORKER_STARTUP_TIMEOUT_MS = 180_000;
let commandAbortController;
let cleanupInProgress = false;

function throwIfInterrupted() {
  if (!cleanupInProgress && commandAbortController?.signal.aborted) throw new Error('QA_INTERRUPTED');
}

export const DEFAULT_QA_PORTS = Object.freeze({ api: 54361, db: 54362 });
export const ALTERNATE_QA_PORTS = Object.freeze({ api: 54371, db: 54372 });

export function validateRunId(value) {
  if (typeof value !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/.test(value)) {
    throw new Error('QA_RUN_ID_INVALID');
  }
  return value;
}

export function validatePorts(api, db) {
  if (!Number.isInteger(api) || !Number.isInteger(db) || api < 1024 || api > 65535 || db < 1024 || db > 65535 || api === db) {
    throw new Error('QA_PORTS_INVALID');
  }
  if ([54321, 54322].includes(api) || [54321, 54322].includes(db)) throw new Error('QA_APP_PORT_FORBIDDEN');
  return { api, db };
}

export function makeNames(runId) {
  const id = validateRunId(runId);
  return {
    projectId: `gm03qa-${id}`,
    networkName: `gm03-qa-${id}`,
    containerName: `supabase_db_gm03qa-${id}`,
    volumeName: `supabase_db_gm03qa-${id}`,
  };
}

export function assertOwnedResource(resource, expected) {
  const labels = resource?.Config?.Labels ?? resource?.Labels ?? {};
  const name = (resource?.Name ?? '').replace(/^\//, '');
  const normalizedPath = value => String(value ?? '').replaceAll('\\', '/').replace(/\/$/, '').toLowerCase();
  if (name !== expected.name || labels['com.supabase.cli.project'] !== expected.projectId
    || normalizedPath(labels['com.supabase.cli.workdir']) !== normalizedPath(expected.workdir)) throw new Error('QA_RESOURCE_OWNERSHIP_MISMATCH');
  return true;
}

export function assertOwnedVolume(resource, expected) {
  const labels = resource?.Labels ?? {};
  if (resource?.Name !== expected.name || labels['com.supabase.cli.project'] !== expected.projectId
    || labels['com.docker.compose.project'] !== expected.projectId) throw new Error('QA_VOLUME_OWNERSHIP_MISMATCH');
  return true;
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function safeRelative(path) { return relative(root, path).split(sep).join('/'); }
function safeOutput(value) { return redact(String(value ?? '')).trim(); }

async function run(file, args, options = {}) {
  try {
    const result = await execFileAsync(file, args, {
      cwd: options.cwd ?? root,
      env: options.env ?? process.env,
      encoding: 'utf8',
      timeout: options.timeoutMs ?? 120_000,
      maxBuffer: options.maxBuffer ?? 32 * 1024 * 1024,
      windowsHide: true,
      signal: cleanupInProgress ? undefined : commandAbortController?.signal,
    });
    if (options.print && result.stdout) process.stdout.write(`${safeOutput(result.stdout)}\n`);
    if (options.print && result.stderr) process.stderr.write(`${safeOutput(result.stderr)}\n`);
    return { stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const detail = safeOutput(error.stderr || error.stdout || error.message);
    throw new Error(`${options.label ?? 'QA_COMMAND_FAILED'}${detail ? `: ${detail}` : ''}`);
  }
}

function qaPaths(runId) {
  const id = validateRunId(runId);
  const workdir = resolve(qaRoot, id);
  const rel = relative(qaRoot, workdir);
  if (!rel || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error('QA_PATH_ESCAPE');
  return {
    runId: id, workdir, supabaseDir: resolve(workdir, 'supabase'),
    stateFile: resolve(workdir, 'state.json'), manifestFile: resolve(workdir, 'manifest.json'),
    privateFile: resolve(workdir, 'private.json'), credentialsFile: resolve(workdir, 'credentials.private.json'),
    logFile: resolve(workdir, 'worker.log'), stageDir: resolve(workdir, 'catalogue-stage'),
  };
}

async function assertNoSymlink(path) {
  const absolute = resolve(path);
  const segments = [];
  let current = absolute;
  while (current !== dirname(current)) { segments.unshift(current); current = dirname(current); }
  segments.unshift(current);
  for (const segment of segments) {
    try { if ((await lstat(segment)).isSymbolicLink()) throw new Error('QA_PATH_SYMLINK_FORBIDDEN'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

async function saveJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  await rename(temp, path);
}

async function createJsonExclusive(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const handle = await open(path, 'wx');
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function readJson(path) { return JSON.parse(await readFile(path, 'utf8')); }

async function portAvailable(port) {
  return new Promise(resolvePromise => {
    const server = createServer();
    server.once('error', () => resolvePromise(false));
    server.listen({ host: '127.0.0.1', port, exclusive: true }, () => server.close(() => resolvePromise(true)));
  });
}

async function assertPortsAvailable(ports) {
  for (const [name, port] of Object.entries(ports)) {
    if (!(await portAvailable(port))) throw new Error(`QA_PORT_IN_USE_${name.toUpperCase()}_${port}; select explicit unused QA ports`);
  }
}

function replaceSectionPort(config, sectionName, port) {
  const start = config.indexOf(`[${sectionName}]`);
  if (start < 0) throw new Error(`QA_CONFIG_SECTION_MISSING_${sectionName}`);
  const next = config.indexOf('\n[', start + 1);
  const end = next < 0 ? config.length : next + 1;
  const section = config.slice(start, end);
  if (!/^port\s*=\s*\d+\s*$/m.test(section)) throw new Error(`QA_CONFIG_PORT_MISSING_${sectionName}`);
  return config.slice(0, start) + section.replace(/^port\s*=\s*\d+\s*$/m, `port = ${port}`) + config.slice(end);
}

async function listMigrations() {
  const files = (await readdir(migrationDir))
    .filter(name => /^\d+_[a-z0-9_-]+\.sql$/i.test(name)).sort();
  if (!files.length) throw new Error('QA_MIGRATIONS_MISSING');
  return Promise.all(files.map(async file => ({
    file,
    version: file.match(/^(\d+)_/)[1],
    sha256: sha256(await readFile(resolve(migrationDir, file))),
  })));
}

async function inspectDocker(kind, name) {
  try {
    const result = await run('docker', [kind, 'inspect', name], { label: `QA_${kind.toUpperCase()}_INSPECT_FAILED` });
    return JSON.parse(result.stdout)[0] ?? null;
  } catch (error) {
    if (/No such (?:object|container|network|volume)|not found/i.test(error.message)) return null;
    throw error;
  }
}

async function psql(state, sql, label = 'QA_DATABASE_QUERY_FAILED') {
  const result = await run('docker', [
    'exec', '-i', state.containerName, 'psql', '-X', '-q', '-U', 'postgres', '-d', 'postgres',
    '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=default', '-At', '-c', sql,
  ], { label, timeoutMs: 60_000 });
  return result.stdout.trim();
}

const functionInventorySqlPath = resolve(root, 'scripts', 'gm03_function_inventory.sql');

async function readRuntimeInventory(state) {
  const functionInventorySql = await readFile(functionInventorySqlPath, 'utf8');
  const [ledgerText, schemaText, functionsText, cataloguesText] = await Promise.all([
    psql(state, `select coalesce(json_agg(json_build_object('version',version::text,'name',name) order by version),'[]'::json)::text from supabase_migrations.schema_migrations;`, 'QA_MIGRATION_LEDGER_READ_FAILED'),
    psql(state, `select coalesce(json_agg(to_jsonb(v) order by v.schema_version),'[]'::json)::text from public.schema_versions v;`, 'QA_SCHEMA_VERSION_READ_FAILED'),
    psql(state, functionInventorySql, 'QA_FUNCTION_INVENTORY_READ_FAILED'),
    psql(state, `select coalesce(json_agg(json_build_object('id',id,'sourceSha256',source_sha,'cardCount',jsonb_array_length(cards),'testOnly',test_only,'active',active) order by id),'[]'::json)::text from dish_v3_private.catalogues;`, 'QA_CATALOGUE_INVENTORY_READ_FAILED'),
  ]);
  return {
    migrationLedger: JSON.parse(ledgerText),
    schemaVersions: JSON.parse(schemaText),
    functions: JSON.parse(functionsText),
    catalogues: JSON.parse(cataloguesText),
  };
}

function hashWithoutSeal(manifest) {
  const { sealSha256, ...body } = manifest;
  return sha256(canonicalJson(body));
}

async function sourceHashMap(migrations) {
  const paths = [...new Set([...migrations.map(item => `supabase/migrations/${item.file}`), ...allowedSourceFiles])].sort();
  const entries = await Promise.all(paths.map(async path => [path, sha256(await readFile(resolve(root, path)))]));
  return Object.fromEntries(entries);
}

function assertLocalServiceStatus(status, ports) {
  const api = new URL(status.API_URL ?? '');
  const db = new URL(status.DB_URL ?? '');
  if (!['127.0.0.1', 'localhost'].includes(api.hostname) || Number(api.port) !== ports.api) throw new Error('QA_API_BINDING_MISMATCH');
  if (!['127.0.0.1', 'localhost'].includes(db.hostname) || Number(db.port) !== ports.db) throw new Error('QA_DB_BINDING_MISMATCH');
  for (const key of ['ANON_KEY', 'SERVICE_ROLE_KEY']) if (typeof status[key] !== 'string' || status[key].length < 20) throw new Error(`QA_${key}_MISSING`);
  return { apiUrl: `http://127.0.0.1:${ports.api}`, dbUrl: `postgresql://127.0.0.1:${ports.db}/postgres` };
}

async function readCliStatus(workdir) {
  const result = await run(process.execPath, [cli, 'status', '--output', 'json', '--workdir', workdir], { label: 'QA_STATUS_FAILED', timeoutMs: 60_000 });
  try { return JSON.parse(result.stdout); }
  catch { throw new Error('QA_STATUS_JSON_INVALID'); }
}

async function setOwnerMarker(state) {
  const sql = `create schema gm03_qa_private;
revoke all on schema gm03_qa_private from public,anon,authenticated,service_role;
create table gm03_qa_private.owner_manifest(run_id text primary key, owner_uuid uuid not null unique, created_at timestamptz not null default clock_timestamp());
revoke all on all tables in schema gm03_qa_private from public,anon,authenticated,service_role;
insert into gm03_qa_private.owner_manifest(run_id,owner_uuid) values('${state.runId}','${state.ownerUuid}');`;
  await psql(state, sql, 'QA_OWNER_MARKER_SETUP_FAILED');
}

async function assertQaOwnership(state, requireMarker = true) {
  const network = await dockerNetworkInfo(state.networkName);
  if (!network || (state.networkId && network.Id !== state.networkId)
    || network.Labels?.['com.gm03.owner_uuid'] !== state.ownerUuid
    || network.Labels?.['com.gm03.run_id'] !== state.runId) throw new Error('QA_NETWORK_OWNERSHIP_OR_ID_MISMATCH');
  const container = await inspectDocker('container', state.containerName);
  if (!container) throw new Error('QA_DATABASE_CONTAINER_MISSING');
  assertOwnedResource(container, { name: state.containerName, projectId: state.projectId, workdir: state.workdir });
  if (requireMarker) {
    const marker = await psql(state, `select owner_uuid::text from gm03_qa_private.owner_manifest where run_id=${sqlLiteral(state.runId)};`, 'QA_DATABASE_OWNER_MARKER_READ_FAILED');
    if (marker !== state.ownerUuid) throw new Error('QA_DATABASE_OWNER_MARKER_MISMATCH');
  }
}

function sqlLiteral(value) { return `'${String(value).replaceAll("'", "''")}'`; }

async function stageAndSeedCatalogues(state) {
  await assertQaOwnership(state);
  const importer = resolve(root, 'supabase', 'seed', 'import_dish_catalogue.py');
  await run(process.env.PYTHON ?? 'python', [
    importer, 'validate', '--input', realInput,
    '--manifest', realSourceManifest,
  ], { label: 'GM40_REAL_CATALOGUE_VALIDATION_FAILED', timeoutMs: 120_000, env: pythonEnv });
  await run(process.env.PYTHON ?? 'python', [
    importer, 'stage', '--input', realInput,
    '--manifest', realSourceManifest, '--staging-dir', state.stageDir,
  ], { label: 'GM40_REAL_CATALOGUE_STAGE_FAILED', timeoutMs: 120_000, env: pythonEnv });
  const realStage = await readJson(resolve(state.stageDir, 'stage.json'));
  const synthetic = await readJson(syntheticFixture);
  if (synthetic.fixtureOnly !== true || synthetic.cards?.length !== 20 || new Set(synthetic.cards.map(card => card.dishId)).size !== 20) {
    throw new Error('GM03_SYNTHETIC_FIXTURE_INVALID');
  }
  const syntheticSha = sha256(await readFile(syntheticFixture));
  const releases = [
    { id: realStage.releaseId, sha: realStage.sourceSha256, cards: realStage.cards, testOnly: true, active: true },
    { id: `dish-catalogue-v1:${synthetic.datasetVersion}`, sha: syntheticSha, cards: synthetic.cards, testOnly: true, active: false },
  ];
  const rows = releases.map(item => `(${sqlLiteral(item.id)},${sqlLiteral(item.sha)},${sqlLiteral(JSON.stringify(item.cards))}::jsonb,${item.testOnly},${item.active})`).join(',\n');
  await assertQaOwnership(state);
  await psql(state, `insert into dish_v3_private.catalogues(id,source_sha,cards,test_only,active) values ${rows};`, 'QA_CATALOGUE_SEED_FAILED');
  await assertQaOwnership(state);
  const readback = JSON.parse(await psql(state, `select coalesce(json_agg(json_build_object('id',id,'sourceSha256',source_sha,'cards',cards,'testOnly',test_only,'active',active) order by id),'[]'::json)::text from dish_v3_private.catalogues;`, 'QA_CATALOGUE_READBACK_FAILED'));
  const expectedReadback = releases.map(item => ({ id: item.id, sourceSha256: item.sha, cards: item.cards, testOnly: item.testOnly, active: item.active })).sort((a, b) => a.id.localeCompare(b.id));
  if (canonicalJson(readback) !== canonicalJson(expectedReadback)) throw new Error('QA_CATALOGUE_READBACK_MISMATCH');
  return {
    real: { releaseId: releases[0].id, sourceSha256: releases[0].sha, count: releases[0].cards.length, fixtureOnly: false },
    synthetic: { releaseId: releases[1].id, sourceSha256: releases[1].sha, count: releases[1].cards.length, fixtureOnly: true },
  };
}

async function createBrunoEnvironment(status, ports, runId) {
  const envPath = brunoPrivatePath(runId);
  await mkdir(dirname(envPath), { recursive: true });
  const content = `vars {\n  baseUrl: http://127.0.0.1:${ports.api}\n  publicKey: ${status.ANON_KEY}\n  runId: ${runId}\n}\n`;
  await writeFile(envPath, content, { encoding: 'utf8', flag: 'wx' });
}

async function checkDockerVersion() { await run('docker', ['info', '--format', '{{.ServerVersion}}'], { label: 'QA_DOCKER_UNAVAILABLE', timeoutMs: 20_000 }); }

async function assertNoProjectResources(projectId) {
  const containers = await run('docker', ['ps', '-a', '--filter', `label=com.supabase.cli.project=${projectId}`, '--format', '{{.Names}}'], { label: 'QA_CONTAINER_PREFLIGHT_FAILED' });
  const volumes = await run('docker', ['volume', 'ls', '--filter', `label=com.supabase.cli.project=${projectId}`, '--format', '{{.Name}}'], { label: 'QA_VOLUME_PREFLIGHT_FAILED' });
  if (containers.stdout.trim() || volumes.stdout.trim()) throw new Error('QA_PROJECT_RESOURCES_ALREADY_EXIST');
}

async function prepareWorkdir(state, migrations, ports) {
  const sourceConfig = await readFile(resolve(root, 'supabase', 'config.toml'), 'utf8');
  let config = sourceConfig.replace(/^project_id\s*=\s*"[^"]+"/m, `project_id = "${state.projectId}"`);
  config = replaceSectionPort(config, 'api', ports.api);
  config = replaceSectionPort(config, 'db', ports.db);
  await mkdir(resolve(state.workdir, 'supabase', 'migrations'), { recursive: true });
  await writeFile(resolve(state.workdir, 'supabase', 'config.toml'), config, 'utf8');
  for (const migration of migrations) await copyFile(resolve(migrationDir, migration.file), resolve(state.workdir, 'supabase', 'migrations', migration.file));
  state.workdir = state.workdir.replaceAll('\\', '/');
  state.configSha256 = sha256(config);
  state.migrations = migrations;
}

async function dockerNetworkInfo(name) { return inspectDocker('network', name); }

async function createOwnedNetwork(state) {
  const existing = await dockerNetworkInfo(state.networkName);
  if (existing) throw new Error('QA_NETWORK_NAME_ALREADY_EXISTS');
  await run('docker', [
    'network', 'create', '--label', `com.gm03.owner_uuid=${state.ownerUuid}`,
    '--label', `com.gm03.run_id=${state.runId}`,
    '-o', 'com.docker.network.bridge.host_binding_ipv4=127.0.0.1', state.networkName,
  ], { label: 'QA_NETWORK_CREATE_FAILED' });
  const network = await dockerNetworkInfo(state.networkName);
  if (!network || network.Labels?.['com.gm03.owner_uuid'] !== state.ownerUuid || network.Labels?.['com.gm03.run_id'] !== state.runId) {
    throw new Error('QA_NETWORK_OWNERSHIP_MISMATCH');
  }
  state.networkId = network.Id;
  state.networkCreated = true;
}

async function addManifestSeal(manifest) {
  manifest.sealSha256 = hashWithoutSeal(manifest);
  return manifest;
}

async function writePrivateState(state, status) {
  await saveJson(state.credentialsFile, {
    apiUrl: status.API_URL, dbUrl: status.DB_URL, anonKey: status.ANON_KEY, serviceRoleKey: status.SERVICE_ROLE_KEY,
  });
  await createBrunoEnvironment(status, state.ports, state.runId);
}

async function spawnWorker(state) {
  const nonce = randomUUID();
  const log = await open(state.logFile, 'a');
  const python = process.env.PYTHON ?? 'python';
  const workerPath = resolve(root, 'scripts', 'dish_policy_worker.py');
  const child = spawn(python, [workerPath, '--qa-manifest', state.manifestFile, '--worker-nonce', nonce], {
    cwd: root, env: pythonEnv, detached: true, windowsHide: true, stdio: ['ignore', log.fd, log.fd],
  });
  const spawned = new Promise((resolvePromise, reject) => {
    child.once('spawn', resolvePromise);
    child.once('error', reject);
  });
  await log.close();
  await spawned;
  state.worker = { pid: child.pid, nonce, script: safeRelative(workerPath), startedAt: new Date().toISOString() };
  child.unref();
}

async function waitForWorkerHeartbeat(state, timeoutMs = 30_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    throwIfInterrupted();
    try {
      const startedAt = sqlLiteral(state.worker?.startedAt ?? '1970-01-01T00:00:00.000Z');
      const active = await psql(state, `select exists(select 1 from dish_v4_private.runtime where last_tick>clock_timestamp()-interval '15 seconds' and last_tick>=${startedAt}::timestamptz);`);
      if (active === 't') return;
    } catch { /* service is still starting */ }
    await new Promise(resolvePromise => setTimeout(resolvePromise, 1000));
  }
  throw new Error('QA_WORKER_HEARTBEAT_TIMEOUT');
}

async function sealManifest(state, status, catalogueInfo) {
  await assertQaOwnership(state);
  const inventory = await readRuntimeInventory(state);
  const expectedVersions = state.migrations.map(migration => migration.version);
  const actualVersions = inventory.migrationLedger.map(item => item.version);
  if (canonicalJson(actualVersions) !== canonicalJson(expectedVersions)) throw new Error('QA_MIGRATION_LEDGER_DOES_NOT_MATCH_CLEAN_SOURCE');
  const expectedSchemas = inventory.schemaVersions.filter(row => row.schema_version === '0.9.1' && row.contract_id === 'dish-session-v4/roadmap-v2/GM-07.B');
  if (expectedSchemas.length !== 1) throw new Error('QA_V4_SCHEMA_0_9_1_MISSING');
  const sourceFiles = await sourceHashMap(state.migrations);
  for (const migration of state.migrations) {
    if (sourceFiles[`supabase/migrations/${migration.file}`] !== migration.sha256) throw new Error('QA_MIGRATION_SOURCE_HASH_MISMATCH');
  }
  const base = {
    format: 'gm03-qa-manifest-v1', runId: state.runId, ownerUuid: state.ownerUuid,
    createdAt: new Date().toISOString(), sourceRevision: state.sourceRevision,
    branch: state.branch, dirtyAtStart: state.dirtyAtStart,
    projectId: state.projectId, workdir: state.workdir, networkName: state.networkName,
    networkId: state.networkId, containerName: state.containerName, volumeName: state.volumeName,
    endpoint: { baseUrl: `http://127.0.0.1:${state.ports.api}`, apiPort: state.ports.api, dbPort: state.ports.db },
    configSha256: state.configSha256, cliVersion: state.cliVersion,
    contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B',
    schemaVersion: '0.9.1',
    migrations: state.migrations, sourceFiles,
    migrationLedger: inventory.migrationLedger, schemaVersions: inventory.schemaVersions,
    functions: inventory.functions, functionInventorySha256: sha256(canonicalJson(inventory.functions)),
    catalogues: { ...catalogueInfo, observed: inventory.catalogues },
    realtimeEnabled: false,
    credentialsWrittenToEvidence: false,
  };
  const manifest = await addManifestSeal(base);
  await saveJson(state.manifestFile, manifest);
  state.manifestSha256 = manifest.sealSha256;
  await saveJson(state.stateFile, state);
  return manifest;
}

async function gitState() {
  const head = (await run('git', ['rev-parse', 'HEAD'], { label: 'QA_GIT_HEAD_FAILED' })).stdout.trim();
  const branch = (await run('git', ['branch', '--show-current'], { label: 'QA_GIT_BRANCH_FAILED' })).stdout.trim();
  const status = (await run('git', ['status', '--porcelain=v1'], { label: 'QA_GIT_STATUS_FAILED' })).stdout;
  return { head, branch, dirty: status.trim().length > 0 };
}

async function setupStartState(runId, ports) {
  const paths = qaPaths(runId);
  await assertNoSymlink(qaRoot);
  await assertNoSymlink(paths.workdir);
  try { await stat(paths.stateFile); throw new Error('QA_RUN_ID_ALREADY_EXISTS_USE_STATUS_OR_STOP'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  try { await lstat(brunoPrivatePath(runId)); throw new Error('QA_BRUNO_PRIVATE_ENV_ALREADY_EXISTS'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await assertPortsAvailable(ports);
  await checkDockerVersion();
  const names = makeNames(runId);
  if (await dockerNetworkInfo(names.networkName)) throw new Error('QA_NETWORK_NAME_ALREADY_EXISTS');
  if (await inspectDocker('container', names.containerName)) throw new Error('QA_CONTAINER_NAME_ALREADY_EXISTS');
  if (await inspectDocker('volume', names.volumeName)) throw new Error('QA_VOLUME_NAME_ALREADY_EXISTS');
  await assertNoProjectResources(names.projectId);
  const git = await gitState();
  const cliVersion = (await run(process.execPath, [cli, '--version'], { label: 'QA_SUPABASE_CLI_VERSION_FAILED' })).stdout.trim();
  if (!cliVersion.includes('2.120.0')) throw new Error('QA_SUPABASE_CLI_VERSION_UNSUPPORTED');
  const state = {
    ...paths, ...names, ownerUuid: randomUUID(), ports,
    sourceRevision: git.head, branch: git.branch, dirtyAtStart: git.dirty,
    createdAt: new Date().toISOString(), phase: 'preflight', cleanup: { completed: [] },
    cliVersion, networkCreated: false,
  };
  await createJsonExclusive(state.stateFile, state);
  return state;
}

async function validateManifestSeal(manifest) {
  if (manifest?.format !== 'gm03-qa-manifest-v1' || !manifest.sealSha256 || hashWithoutSeal(manifest) !== manifest.sealSha256) {
    throw new Error('QA_MANIFEST_SEAL_INVALID');
  }
  if (manifest.schemaVersion !== '0.9.1' || manifest.contractVersion !== 'dish-session-v4/roadmap-v2/GM-07.B') throw new Error('QA_MANIFEST_CONTRACT_MISMATCH');
}

async function verifySourceAndRuntime(state, manifest) {
  await validateManifestSeal(manifest);
  const currentSources = await sourceHashMap(manifest.migrations);
  if (canonicalJson(currentSources) !== canonicalJson(manifest.sourceFiles)) throw new Error('QA_SOURCE_HASH_DRIFT');
  const currentMigrations = await listMigrations();
  if (canonicalJson(currentMigrations) !== canonicalJson(manifest.migrations)) throw new Error('QA_MIGRATION_SOURCE_DRIFT');
  const workdirConfig = await readFile(resolve(state.workdir, 'supabase', 'config.toml'));
  if (sha256(workdirConfig) !== manifest.configSha256) throw new Error('QA_QA_CONFIG_DRIFT');
  const copiedMigrations = await Promise.all(manifest.migrations.map(async migration => ({
    file: migration.file, version: migration.version,
    sha256: sha256(await readFile(resolve(state.workdir, 'supabase', 'migrations', migration.file))),
  })));
  if (canonicalJson(copiedMigrations) !== canonicalJson(manifest.migrations)) throw new Error('QA_COPIED_MIGRATION_DRIFT');
  await assertQaOwnership(state);
  const runtime = await readRuntimeInventory(state);
  if (canonicalJson(runtime.migrationLedger) !== canonicalJson(manifest.migrationLedger)) throw new Error('QA_DATABASE_MIGRATION_LEDGER_DRIFT');
  if (canonicalJson(runtime.schemaVersions) !== canonicalJson(manifest.schemaVersions)) throw new Error('QA_DATABASE_SCHEMA_VERSIONS_DRIFT');
  if (canonicalJson(runtime.functions) !== canonicalJson(manifest.functions)) throw new Error('QA_DATABASE_FUNCTION_DEFINITION_OR_ACL_DRIFT');
  if (canonicalJson(runtime.catalogues) !== canonicalJson(manifest.catalogues.observed)) throw new Error('QA_DATABASE_CATALOGUE_DRIFT');
  if (sha256(canonicalJson(runtime.functions)) !== manifest.functionInventorySha256) throw new Error('QA_FUNCTION_INVENTORY_HASH_MISMATCH');
  if (runtime.migrationLedger.length !== manifest.migrations.length) throw new Error('QA_MIGRATION_COUNT_MISMATCH');
  return { migrationCount: runtime.migrationLedger.length, functionCount: runtime.functions.length, catalogueCount: runtime.catalogues.length };
}

async function windowsCommandLine(pid) {
  if (process.platform === 'win32') {
    const script = `$p=Get-CimInstance Win32_Process -Filter "ProcessId = ${Number(pid)}"; if ($null -ne $p) { $p.CommandLine }`;
    return (await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { label: 'QA_WORKER_PROCESS_QUERY_FAILED', timeoutMs: 20_000 })).stdout.trim();
  }
  try { return (await run('ps', ['-p', String(pid), '-o', 'args='], { label: 'QA_WORKER_PROCESS_QUERY_FAILED' })).stdout.trim(); }
  catch { return ''; }
}

export function workerProcessMatches(commandLine, workerPath, nonce) {
  return typeof commandLine === 'string' && commandLine.includes(workerPath) && commandLine.includes('--worker-nonce') && commandLine.includes(nonce);
}

export async function runTrackedStep(state, name, operation, persist = async () => {}) {
  const completed = state.cleanup?.completed ?? [];
  if (completed.includes(name)) return false;
  await operation();
  state.cleanup = { ...state.cleanup, completed: [...completed, name] };
  await persist(state);
  return true;
}

async function stopWorker(state) {
  if (!state.worker?.pid) return;
  const commandLine = await windowsCommandLine(state.worker.pid);
  if (!commandLine) { state.worker = null; return; }
  const workerPath = resolve(root, state.worker.script);
  if (!workerProcessMatches(commandLine, workerPath, state.worker.nonce)) throw new Error('QA_WORKER_PID_NOT_OWNED');
  if (process.platform === 'win32') {
    await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Stop-Process -Id ${Number(state.worker.pid)} -Force`], { label: 'QA_WORKER_STOP_FAILED', timeoutMs: 20_000 });
  } else {
    process.kill(Number(state.worker.pid), 'SIGTERM');
  }
  for (let i = 0; i < 20; i += 1) {
    if (!(await windowsCommandLine(state.worker.pid))) { state.worker = null; return; }
    await new Promise(resolvePromise => setTimeout(resolvePromise, 250));
  }
  throw new Error('QA_WORKER_DID_NOT_STOP');
}

async function projectResourcesExist(state) {
  const result = await run('docker', ['ps', '-a', '--filter', `label=com.supabase.cli.project=${state.projectId}`, '--format', '{{.Names}}'], { label: 'QA_CONTAINER_LIST_FAILED' });
  const names = result.stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (names.length) {
    for (const name of names) {
      const info = await inspectDocker('container', name);
      assertOwnedResource(info, { name, projectId: state.projectId, workdir: state.workdir });
    }
  }
  const volumes = await run('docker', ['volume', 'ls', '--filter', `label=com.supabase.cli.project=${state.projectId}`, '--format', '{{.Name}}'], { label: 'QA_VOLUME_LIST_FAILED' });
  for (const name of volumes.stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean)) {
    const info = await inspectDocker('volume', name);
    assertOwnedVolume(info, { name, projectId: state.projectId });
  }
  return { containerNames: names, volumes: volumes.stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean) };
}

async function cleanupNetwork(state) {
  const network = await dockerNetworkInfo(state.networkName);
  if (!network) return;
  if ((state.networkId && network.Id !== state.networkId) || network.Labels?.['com.gm03.owner_uuid'] !== state.ownerUuid || network.Labels?.['com.gm03.run_id'] !== state.runId) {
    throw new Error('QA_NETWORK_CLEANUP_OWNERSHIP_MISMATCH');
  }
  await run('docker', ['network', 'rm', state.networkName], { label: 'QA_NETWORK_REMOVE_FAILED' });
}

async function cleanupRun(state) {
  const previousCleanupState = cleanupInProgress;
  cleanupInProgress = true;
  try { return await cleanupRunSteps(state); }
  finally { cleanupInProgress = previousCleanupState; }
}

async function cleanupRunSteps(state) {
  const persist = current => saveJson(state.stateFile, current);
  await runTrackedStep(state, 'worker', () => stopWorker(state), persist);
  await runTrackedStep(state, 'supabase', async () => {
    const before = await projectResourcesExist(state);
    if (before.containerNames.length || before.volumes.length) {
      await run(process.execPath, [cli, 'stop', '--project-id', state.projectId, '--no-backup', '--workdir', state.workdir], { label: 'QA_SUPABASE_STOP_FAILED', timeoutMs: 180_000, print: true });
    }
    const after = await projectResourcesExist(state);
    if (after.containerNames.length || after.volumes.length) throw new Error('QA_SUPABASE_RESOURCES_REMAIN');
  }, persist);
  await runTrackedStep(state, 'network', () => cleanupNetwork(state), persist);
  await unlink(state.credentialsFile).catch(error => { if (error.code !== 'ENOENT') throw error; });
  await unlink(brunoPrivatePath(state.runId)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  state.phase = 'stopped'; state.stoppedAt = new Date().toISOString(); state.lastError = null;
  await saveJson(state.stateFile, state);
  return { stopped: true, runId: state.runId, cleaned: state.cleanup.completed };
}

async function doStart(runId, ports) {
  const state = await setupStartState(runId, ports);
  try {
    const migrations = await listMigrations();
    await prepareWorkdir(state, migrations, ports);
    state.phase = 'prepared'; await saveJson(state.stateFile, state);
    await createOwnedNetwork(state);
    state.phase = 'network-created'; await saveJson(state.stateFile, state);
    await run(process.execPath, [cli, 'start', '--workdir', state.workdir, '--network-id', state.networkId], { label: 'QA_SUPABASE_START_FAILED', timeoutMs: 900_000, print: true });
    const status = await readCliStatus(state.workdir);
    const endpoints = assertLocalServiceStatus(status, ports);
    if (endpoints.apiUrl !== `http://127.0.0.1:${ports.api}`) throw new Error('QA_API_ENDPOINT_MISMATCH');
    state.phase = 'supabase-started'; await saveJson(state.stateFile, state);
    await writePrivateState(state, status);
    await setOwnerMarker(state);
    const catalogues = await stageAndSeedCatalogues(state);
    state.phase = 'catalogues-seeded'; await saveJson(state.stateFile, state);
    const manifest = await sealManifest(state, status, catalogues);
    state.phase = 'manifest-sealed'; await saveJson(state.stateFile, state);
    await spawnWorker(state);
    await saveJson(state.stateFile, state);
    await waitForWorkerHeartbeat(state, WORKER_STARTUP_TIMEOUT_MS);
    state.phase = 'ready'; await saveJson(state.stateFile, state);
    console.log(JSON.stringify({ result: 'READY', runId, baseUrl: manifest.endpoint.baseUrl, projectId: state.projectId, manifest: safeRelative(state.manifestFile), ports, worker: 'heartbeat ready', credentialsPrinted: false }, null, 2));
    return state;
  } catch (error) {
    state.phase = 'cleanup-required'; state.lastError = safeOutput(error.message); await saveJson(state.stateFile, state);
    try { await cleanupRun(state); }
    catch (cleanupError) {
      state.phase = 'cleanup-required'; state.lastError = safeOutput(error.message); state.cleanupError = safeOutput(cleanupError.message); await saveJson(state.stateFile, state);
      throw new Error(`${state.lastError}; QA_CLEANUP_REQUIRES_RETRY: ${state.cleanupError}`);
    }
    throw error;
  }
}

async function loadOwnedState(runId) {
  const paths = qaPaths(runId);
  await assertNoSymlink(paths.workdir);
  await assertNoSymlink(paths.stateFile);
  const state = await readJson(paths.stateFile);
  const names = makeNames(runId);
  if (state.runId !== runId || state.workdir.replaceAll('\\', '/') !== paths.workdir.replaceAll('\\', '/')
    || !/^[0-9a-f-]{36}$/.test(state.ownerUuid ?? '') || state.projectId !== names.projectId
    || state.networkName !== names.networkName || state.containerName !== names.containerName || state.volumeName !== names.volumeName) {
    throw new Error('QA_STATE_OWNERSHIP_MISMATCH');
  }
  validatePorts(state.ports?.api, state.ports?.db);
  return state;
}

async function loadAndVerify(runId) {
  const state = await loadOwnedState(runId);
  if (state.phase === 'stopped') throw new Error('QA_RUN_STOPPED');
  const manifest = await readJson(state.manifestFile);
  if (state.manifestSha256 !== manifest.sealSha256) throw new Error('QA_STATE_MANIFEST_HASH_MISMATCH');
  const counts = await verifySourceAndRuntime(state, manifest);
  return { state, manifest, counts };
}

async function doStatus(runId) {
  const state = await loadOwnedState(runId);
  const network = await dockerNetworkInfo(state.networkName);
  let database = null;
  try { database = await inspectDocker('container', state.containerName); } catch { /* displayed as unknown */ }
  const workerCommand = state.worker?.pid ? await windowsCommandLine(state.worker.pid) : '';
  const workerRunning = state.worker ? workerProcessMatches(workerCommand, resolve(root, state.worker.script), state.worker.nonce) : false;
  console.log(JSON.stringify({ runId, phase: state.phase, projectId: state.projectId, endpoint: `http://127.0.0.1:${state.ports.api}`, ports: state.ports, networkOwned: Boolean(network && network.Labels?.['com.gm03.owner_uuid'] === state.ownerUuid), databaseRunning: Boolean(database?.State?.Running), workerRunning, cleanup: state.cleanup?.completed ?? [], lastError: state.lastError ?? null, credentialsPrinted: false }, null, 2));
}

async function doVerify(runId) {
  const { state, manifest, counts } = await loadAndVerify(runId);
  await assertWorkerRunning(state);
  await waitForWorkerHeartbeat(state);
  console.log(JSON.stringify({ result: 'PASS', runId, contractVersion: manifest.contractVersion, schemaVersion: manifest.schemaVersion, ...counts, workerHeartbeat: 'recent', ownership: 'verified', secretsPrinted: false }, null, 2));
}

async function doWorkerStart(runId) {
  const { state, manifest } = await loadAndVerify(runId);
  if (state.phase === 'stopped' || state.phase === 'cleanup-required') throw new Error('QA_RUN_NOT_WORKER_STARTABLE');

  if (state.worker?.pid) {
    const commandLine = await windowsCommandLine(state.worker.pid);
    if (commandLine && !workerProcessMatches(commandLine, resolve(root, state.worker.script), state.worker.nonce)) {
      throw new Error('QA_WORKER_PID_NOT_OWNED');
    }
    if (commandLine) {
      await waitForWorkerHeartbeat(state);
      console.log(JSON.stringify({ result: 'ALREADY_RUNNING', runId, worker: 'heartbeat recent', sourceRevision: manifest.sourceRevision, secretsPrinted: false }, null, 2));
      return;
    }
    state.worker = null;
  }

  await spawnWorker(state);
  await saveJson(state.stateFile, state);
  try {
    await waitForWorkerHeartbeat(state, WORKER_STARTUP_TIMEOUT_MS);
  } catch (error) {
    try { await stopWorker(state); }
    finally { await saveJson(state.stateFile, state); }
    throw error;
  }
  state.phase = 'ready';
  await saveJson(state.stateFile, state);
  console.log(JSON.stringify({ result: 'READY', runId, worker: 'heartbeat ready', sourceRevision: manifest.sourceRevision, secretsPrinted: false }, null, 2));
}

async function doTest(runId) {
  const { state, manifest } = await loadAndVerify(runId);
  await assertWorkerRunning(state);
  await waitForWorkerHeartbeat(state);
  const env = { ...process.env, GM03_QA_WORKDIR: state.workdir, GM03_QA_MANIFEST: state.manifestFile };
  await run(process.execPath, [resolve(root, 'scripts', 'gm03_qa_http_check.mjs')], { label: 'GM03_AUTH_REST_TEST_FAILED', timeoutMs: 120_000, env, print: true });
  await run(process.execPath, [resolve(root, 'scripts', 'gm_v4_http_check.mjs')], { label: 'GM_V4_HTTP_TEST_FAILED', timeoutMs: 900_000, env, print: true });
  const after = await loadAndVerify(runId);
  const report = {
    runId, sourceRevision: manifest.sourceRevision, contractVersion: manifest.contractVersion,
    schemaVersion: manifest.schemaVersion, projectId: state.projectId, endpoint: manifest.endpoint,
    applicationDatabaseChanged: false, credentialsWrittenToReport: false,
    gm03: JSON.parse(await readFile(resolve(state.workdir, 'gm03-auth-rest-report.json'), 'utf8')),
    v4: JSON.parse(await readFile(resolve(state.workdir, 'api-check-results.json'), 'utf8')),
    verificationAfterSuite: after.counts, completedAt: new Date().toISOString(),
  };
  await saveJson(resolve(state.workdir, 'test-report.json'), report);
  console.log(JSON.stringify({ result: 'PASS', runId, gm03Assertions: report.gm03.assertionCount, v4Assertions: report.v4.caseCount, report: safeRelative(resolve(state.workdir, 'test-report.json')), sourceRevision: manifest.sourceRevision, credentialsPrinted: false }, null, 2));
}

async function assertWorkerRunning(state) {
  const commandLine = state.worker?.pid ? await windowsCommandLine(state.worker.pid) : '';
  if (!commandLine) throw new Error('QA_WORKER_NOT_RUNNING');
  if (!workerProcessMatches(commandLine, resolve(root, state.worker.script), state.worker.nonce)) {
    throw new Error('QA_WORKER_PID_NOT_OWNED');
  }
}

async function doWorkerStop(runId) {
  const state = await loadOwnedState(runId);
  await stopWorker(state);
  await saveJson(state.stateFile, state);
  console.log(JSON.stringify({ result: 'STOPPED', runId, worker: 'stopped', databasePreserved: true, secretsPrinted: false }, null, 2));
}

export function parseArgs(argv) {
  const [operation, ...rest] = argv;
  const valid = ['start', 'status', 'verify', 'test', 'worker-start', 'worker-stop', 'stop'];
  if (!valid.includes(operation)) throw new Error('Usage: npm run qa:<start|status|verify|test|worker-start|worker-stop|stop> -- --run-id <safe-id> [--api-port 54361 --db-port 54362]');
  const options = { operation, runId: null, apiPort: DEFAULT_QA_PORTS.api, dbPort: DEFAULT_QA_PORTS.db };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--run-id' && rest[i + 1]) options.runId = validateRunId(rest[++i]);
    else if (arg === '--api-port' && rest[i + 1]) options.apiPort = Number(rest[++i]);
    else if (arg === '--db-port' && rest[i + 1]) options.dbPort = Number(rest[++i]);
    else throw new Error('QA_ARGUMENT_INVALID');
  }
  if (!options.runId) throw new Error('QA_RUN_ID_REQUIRED');
  options.ports = validatePorts(options.apiPort, options.dbPort);
  return options;
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.operation === 'start') await doStart(options.runId, options.ports);
  else if (options.operation === 'status') await doStatus(options.runId);
  else if (options.operation === 'verify') await doVerify(options.runId);
  else if (options.operation === 'test') await doTest(options.runId);
  else if (options.operation === 'worker-start') await doWorkerStart(options.runId);
  else if (options.operation === 'worker-stop') await doWorkerStop(options.runId);
  else {
    const state = await loadOwnedState(options.runId);
    const result = await cleanupRun(state);
    console.log(JSON.stringify(result, null, 2));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2);
  commandAbortController = new AbortController();
  const abort = () => commandAbortController.abort();
  process.once('SIGINT', abort);
  process.once('SIGTERM', abort);
  main(argv).catch(async error => {
    if (commandAbortController.signal.aborted) {
      try {
        const { runId } = parseArgs(argv);
        const state = await loadOwnedState(runId);
        if (state.phase !== 'stopped') {
          const result = await cleanupRun(state);
          console.log(JSON.stringify({ result: 'INTERRUPTED_CLEANUP', ...result }, null, 2));
        } else {
          console.log(JSON.stringify({ result: 'INTERRUPTED_CLEANUP', runId, stopped: true }, null, 2));
        }
        process.exitCode = 130;
      } catch (cleanupError) {
        const message = safeOutput(cleanupError.message);
        if (/ENOENT|QA_PATH/i.test(message)) console.error('QA_INTERRUPTED; no owned QA state found; no resources were stopped');
        else console.error(`QA_INTERRUPTED; cleanup requires retry: ${message}`);
        process.exitCode = 1;
      }
      return;
    }
    console.error(safeOutput(error.message));
    process.exitCode = 1;
  }).finally(() => {
    process.removeListener('SIGINT', abort);
    process.removeListener('SIGTERM', abort);
  });
}
