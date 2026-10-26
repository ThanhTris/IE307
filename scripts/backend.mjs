import { spawn } from 'node:child_process';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const projectId = 'gi-cung-duoc-local';
const cliScript = resolve(root, 'node_modules/supabase/dist/supabase.js');
const excluded = 'realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor';

export function redact(text) {
  return String(text)
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED JWT]')
    .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+\b/g, '[REDACTED KEY]')
    .replace(/(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+@/gi, '$1[REDACTED]@')
    .replace(/((?:anon[ _-]?key|service[ _-]?role[ _-]?key|secret[ _-]?key|publishable[ _-]?key|password|access[ _-]?token)["']?\s*[:=]\s*)[^\r\n]+/gi, '$1[REDACTED]');
}

export function isTransientDockerStartupFailure(message) {
  const value = String(message);
  if (/data limit exceeded|no space left|disk quota|insufficient storage|manifest unknown|permission denied|not ok\b|syntax error/i.test(value)) return false;
  return /(?:failed to pull|error pulling|pulling image|docker.*(?:network|timeout|temporary failure)|TLS handshake timeout|unexpected EOF|connection reset by peer|i\/o timeout|dial tcp.*(?:timeout|temporary failure|connection refused))/i.test(value);
}

function commandDiagnostics(stdout, stderr, code, timedOut) {
  const sections = [];
  if (stdout.trim()) sections.push(`stdout:\n${stdout.trim()}`);
  if (stderr.trim()) sections.push(`stderr:\n${stderr.trim()}`);
  const reason = timedOut ? 'Command timed out.' : `Command exited with code ${code}.`;
  return redact([reason, ...sections].join('\n\n'));
}

export function validateConfig(text) {
  const project = text.match(/^project_id\s*=\s*"([^"]+)"\s*$/m)?.[1];
  const section = name => text.match(new RegExp(`^\\[${name}\\]\\s*\\r?\\n([\\s\\S]*?)(?=^\\[|$(?![\\s\\S]))`, 'm'))?.[1] ?? '';
  if (project !== projectId || !/^port\s*=\s*54321\s*$/m.test(section('api')) || !/^port\s*=\s*54322\s*$/m.test(section('db'))) {
    throw new Error('Local guard: expected gi-cung-duoc-local / API 54321 / DB 54322. Review config and runner together.');
  }
}

export function validateApiUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.port !== '54321' || url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) {
    throw new Error('Local guard: only loopback API port 54321 is permitted.');
  }
  return url.origin;
}

export function cliArgs(action, extra = []) {
  // No arbitrary flags can reach CLI; no linked/project-ref/db-url/all/no-backup options.
  if (extra.length && !(action === 'reset' && extra.length === 1 && extra[0] === '--confirm-local')) throw new Error('Unsupported arguments. Reset requires --confirm-local.');
  const args = {
    start: ['start', '--exclude', excluded],
    status: ['status', '--output', 'json'],
    stop: ['stop', '--project-id', projectId],
    test: ['test', 'db', '--local', 'supabase/tests/database'],
    reset: ['db', 'reset', '--local', '--no-seed', '--yes'],
  }[action];
  if (!args) throw new Error('Usage: backend.mjs start|status|stop|smoke|test|reset --confirm-local');
  if (action === 'reset' && extra[0] !== '--confirm-local') throw new Error('Reset erases only this local DB. Explicit --confirm-local required.');
  return [cliScript, ...args, '--workdir', root];
}

export async function runCommand(command, args, { quiet = false, timeoutMs = 120000, capturePath } = {}) {
  return await new Promise((accept, reject) => {
    const child = spawn(command, args, { cwd: root, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '', errors = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { errors += chunk; });
    child.once('error', () => { clearTimeout(timer); reject(new Error(`Cannot run ${command === process.execPath ? 'Supabase CLI' : command}. Install tooling/runtime first.`)); });
    child.once('close', async code => {
      clearTimeout(timer);
      const fullDiagnostics = commandDiagnostics(output, errors, code, timedOut);
      if (capturePath) {
        try { await appendFile(capturePath, `${fullDiagnostics}\n`, { encoding: 'utf8', mode: 0o600 }); }
        catch (error) { console.error(`Could not save sanitized command diagnostics: ${redact(error.message)}`); }
      }
      const diagnostics = fullDiagnostics.length > 20000
        ? `${fullDiagnostics.slice(0, 20000)}\n[diagnostics truncated in console; complete sanitized log saved separately]`
        : fullDiagnostics;
      if (code !== 0 || timedOut) { reject(new Error(diagnostics)); return; }
      if (!quiet && output.trim()) console.log(redact(output.trim()));
      // Successful CLI stderr may carry progress but also keys. Never dump status data.
      accept(output);
    });
  });
}

export function parseStatus(output) {
  let state;
  try { state = JSON.parse(output); } catch { throw new Error('CLI status was not JSON; verify Supabase CLI 2.120.0. Raw output suppressed.'); }
  const apiUrl = state.API_URL ?? state.api?.url ?? state['api.url'];
  if (typeof apiUrl !== 'string') throw new Error('CLI status has no local API URL. Start the local services first.');
  return { apiUrl: validateApiUrl(apiUrl) }; // Deliberately discard all keys, passwords and tokens.
}

export async function checkHealth(apiUrl, fetcher = fetch) {
  const origin = validateApiUrl(apiUrl);
  let response;
  try {
    response = await fetcher(`${origin}/auth/v1/health`, { headers: { Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(10000) });
  } catch { throw new Error('Local Auth health connection failed. Run backend:start and check Docker.'); }
  if (response.status !== 200) throw new Error(`Local Auth health: expected HTTP 200, received ${response.status}.`);
  const body = await response.json();
  if (body.name !== 'GoTrue' || typeof body.version !== 'string' || !body.version || typeof body.description !== 'string' || !body.description) throw new Error('Local Auth health body assertion failed.');
  return { method: 'GET', path: '/auth/v1/health', status: response.status, body: { name: body.name, version: body.version, description: body.description }, assertions: 'status/name/version/description PASS' };
}

async function runTestDbWithTransientRetry(run, command, args, options) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await run(command, args, options);
    } catch (error) {
      if (attempt === 3 || !isTransientDockerStartupFailure(error.message)) throw error;
      console.warn(`Transient Docker image/network startup failure; retry ${attempt + 1}/3.`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

export async function main(action, extra = [], dependencies = {}) {
  // Validate action/flags before any subprocess or destructive operation.
  const targetAction = action === 'smoke' ? 'status' : action;
  const args = cliArgs(targetAction, extra);
  const run = dependencies.run ?? runCommand;
  const load = dependencies.load ?? readFile;
  validateConfig(await load(resolve(root, 'supabase/config.toml'), 'utf8'));
  try { await load(cliScript, 'utf8'); } catch { throw new Error('Supabase CLI missing. Run npm ci at repository root.'); }
  try { await run('docker', ['info', '--format', '{{.ServerVersion}}'], { quiet: true, timeoutMs: 60000 }); }
  catch (error) { throw new Error(`Docker engine is not available. Start Docker Desktop (Linux containers), then retry. Details: ${redact(error.message)}`); }
  if (action === 'status' || action === 'smoke') {
    const state = parseStatus(await run(process.execPath, args, { quiet: true }));
    console.log(JSON.stringify({ projectId, apiUrl: state.apiUrl }, null, 2));
    if (action === 'smoke') console.log(JSON.stringify(await checkHealth(state.apiUrl, dependencies.fetcher), null, 2));
    return;
  }
  if (action === 'reset') {
    // Confirm CLI is talking to the expected running local project before reset.
    parseStatus(await run(process.execPath, cliArgs('status'), { quiet: true }));
  }
  if (action === 'test') {
    parseStatus(await run(process.execPath, cliArgs('status'), { quiet: true }));
    const tests = await load(resolve(root, 'supabase/tests/database/00_local_smoke.test.sql'), 'utf8');
    if (!/select plan\([1-9]\d*\)/i.test(tests)) throw new Error('Refusing zero-assertion database smoke.');
  }
  const commandOptions = {
    quiet: action === 'start', timeoutMs: action === 'start' ? 900000 : action === 'test' ? 600000 : 120000,
    ...(action === 'test' && process.env.GM06_TAP_LOG_PATH ? { capturePath: process.env.GM06_TAP_LOG_PATH } : {}),
  };
  if (action === 'test' && commandOptions.capturePath) {
    await writeFile(commandOptions.capturePath, '', { encoding: 'utf8', mode: 0o600 });
  }
  if (action === 'test') await runTestDbWithTransientRetry(run, process.execPath, args, commandOptions);
  else await run(process.execPath, args, commandOptions);
  if (action === 'start') {
    parseStatus(await run(process.execPath, cliArgs('status'), { quiet: true }));
    console.log('Local foundation started. Run backend:smoke and backend:test. Business schema/auth policies are not implemented.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv[2], process.argv.slice(3)).catch(error => { console.error(redact(error.message)); process.exitCode = 1; });
}
