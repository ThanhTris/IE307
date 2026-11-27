// QA-only fault-injection proxy for GM-65 AVD checks. Loopback only; forwards to a local QA API.
// node scripts/gm65_fault_proxy.mjs <qaApiPort> <listenPort> <rule.json>
// rule.json (absent = pass through):
// { "match": "url substring", "bodyContains": "optional", "mode": "status|drop|delay|hang|malformed|code",
//   "status": 503, "code": "ROOM_EXPIRED", "delayMs": 15000, "times": 1 }
import { createServer, request } from 'node:http';
import { connect } from 'node:net';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const HOST = '127.0.0.1';
export const MODES = Object.freeze(['status', 'drop', 'delay', 'hang', 'malformed', 'code']);

export function matchesRule(rule, method, url, body = '') {
  if (!rule || method === 'OPTIONS' || !MODES.includes(rule.mode)) return false;
  if (typeof rule.match !== 'string' || !rule.match || !url.includes(rule.match)) return false;
  return !rule.bodyContains || String(body).includes(rule.bodyContains);
}

/** The reply that replaces the QA server's answer; `null` means this mode sends no replacement. */
export function faultReply(rule) {
  if (rule.mode === 'status') return { status: rule.status ?? 503, body: rule.body ?? { message: 'QA injected fault' } };
  if (rule.mode === 'malformed') return { status: 200, body: { broken: true } };
  if (rule.mode === 'code') return { status: 200, body: { ok: false, error: { messageKey: rule.code ?? 'UNKNOWN_ERROR' } } };
  return null;
}

export function createProxy({ qaPort, rulePath, log = () => {} }) {
  const readRule = () => {
    try { return existsSync(rulePath) ? JSON.parse(readFileSync(rulePath, 'utf8')) : null; } catch { return null; }
  };
  const consume = rule => {
    if (!Number.isInteger(rule.times)) return;
    if (rule.times <= 1) unlinkSync(rulePath);
    else writeFileSync(rulePath, JSON.stringify({ ...rule, times: rule.times - 1 }));
  };
  const forward = (req, res, body) => {
    const up = request({ hostname: HOST, port: qaPort, method: req.method, path: req.url,
      headers: { ...req.headers, host: `${HOST}:${qaPort}` } }, reply => {
      res.writeHead(reply.statusCode, reply.headers);
      reply.pipe(res);
    });
    up.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
    up.end(body);
  };
  const server = createServer((req, res) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const rule = readRule();
      if (!matchesRule(rule, req.method, req.url, body)) return forward(req, res, body);
      consume(rule);
      // Path only: query strings, headers and bodies are never logged.
      log('FAULT', rule.mode, rule.status ?? rule.code ?? '', req.method, req.url.split('?')[0]);
      if (rule.mode === 'drop') return req.socket.destroy();
      if (rule.mode === 'hang') return undefined;
      if (rule.mode === 'delay') return setTimeout(() => forward(req, res, body), rule.delayMs ?? 15_000);
      const reply = faultReply(rule);
      return setTimeout(() => {
        res.writeHead(reply.status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(reply.body));
      }, rule.delayMs ?? 0);
    });
  });
  // Realtime websocket passes straight through.
  server.on('upgrade', (req, socket, head) => {
    const up = connect(qaPort, HOST, () => {
      const lines = [];
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        const name = req.rawHeaders[i];
        lines.push(`${name}: ${name.toLowerCase() === 'host' ? `${HOST}:${qaPort}` : req.rawHeaders[i + 1]}`);
      }
      up.write([`${req.method} ${req.url} HTTP/${req.httpVersion}`, ...lines, '', ''].join('\r\n'));
      up.write(head);
      socket.pipe(up).pipe(socket);
    });
    up.on('error', () => socket.destroy());
    socket.on('error', () => up.destroy());
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [qaPort, port, rulePath] = process.argv.slice(2);
  if (!Number(qaPort) || !Number(port) || !rulePath) {
    console.error('Usage: node scripts/gm65_fault_proxy.mjs <qaApiPort> <listenPort> <rule.json>');
    process.exit(2);
  }
  const log = (...parts) => console.log(new Date().toISOString(), ...parts);
  createProxy({ qaPort: Number(qaPort), rulePath: resolve(rulePath), log })
    .listen(Number(port), HOST, () => log('fault proxy', port, '->', qaPort));
}
