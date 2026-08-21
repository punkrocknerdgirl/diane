#!/usr/bin/env node
/**
 * clickup-glossary.mjs — read/write a single ClickUp Doc page via the v3 Docs API.
 *
 * Built for the Diane 2.0 /checkpoint skill, which needs to fetch the Terminal &
 * Git Glossary page, merge in new commands, and push the whole page back.
 * Transport only — this script does no parsing, merging, or sorting.
 *
 * Usage:
 *   node scripts/clickup-glossary.mjs whoami
 *   node scripts/clickup-glossary.mjs get [outfile]      # stdout if no outfile
 *   node scripts/clickup-glossary.mjs put <infile>       # replaces page content
 *
 * Token resolution, in order:
 *   1. CLICKUP_TOKEN env var
 *   2. macOS keychain: security find-generic-password -s clickup-api-token -w
 * The token is never printed, logged, or written to disk by this script.
 *
 * Workspace ID resolution, in order:
 *   1. CLICKUP_WORKSPACE_ID env var
 *   2. GET /api/v2/team — used automatically only if the token sees exactly one workspace
 *
 * Doc and page default to the Terminal & Git Glossary; override with
 * CLICKUP_DOC_ID / CLICKUP_PAGE_ID.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const API = 'https://api.clickup.com';
const DOC_ID = process.env.CLICKUP_DOC_ID || '8chynfx-8591';
const PAGE_ID = process.env.CLICKUP_PAGE_ID || '8chynfx-13531';
const KEYCHAIN_SERVICE = 'clickup-api-token';

function die(message) {
  console.error(`clickup-glossary: ${message}`);
  process.exit(1);
}

function resolveToken() {
  if (process.env.CLICKUP_TOKEN) return process.env.CLICKUP_TOKEN.trim();
  try {
    return execFileSync('security', ['find-generic-password', '-s', KEYCHAIN_SERVICE, '-w'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    die(
      `no API token found.\n` +
        `  Store one in the keychain (the token never enters the terminal history this way):\n` +
        `    security add-generic-password -s ${KEYCHAIN_SERVICE} -a "$USER" -w\n` +
        `  ...then paste the token at the prompt. Or export CLICKUP_TOKEN for a one-off run.`
    );
  }
}

/**
 * Errors carry status and ClickUp's message but never the request headers,
 * so a failed call can't leak the token into a log or transcript.
 */
async function call(token, method, path, { body, query } = {}) {
  const url = new URL(path, API);
  for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, v);

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: token,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  if (!res.ok) {
    die(`${method} ${url.pathname} failed with HTTP ${res.status}\n  ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : {};
}

async function resolveWorkspaceId(token) {
  if (process.env.CLICKUP_WORKSPACE_ID) return process.env.CLICKUP_WORKSPACE_ID.trim();

  const { teams = [] } = await call(token, 'GET', '/api/v2/team');
  if (teams.length === 1) return teams[0].id;
  if (teams.length === 0) die('this token has access to no workspaces.');

  const list = teams.map((t) => `    ${t.id}  ${t.name}`).join('\n');
  die(`token sees ${teams.length} workspaces — set CLICKUP_WORKSPACE_ID to one of:\n${list}`);
}

const pagePath = (workspaceId) =>
  `/api/v3/workspaces/${workspaceId}/docs/${DOC_ID}/pages/${PAGE_ID}`;

async function whoami(token) {
  const { user } = await call(token, 'GET', '/api/v2/user');
  const { teams = [] } = await call(token, 'GET', '/api/v2/team');
  console.log(`authenticated as: ${user.username} <${user.email}>`);
  console.log('workspaces:');
  for (const t of teams) console.log(`  ${t.id}  ${t.name}`);
  console.log(`target doc:  ${DOC_ID}`);
  console.log(`target page: ${PAGE_ID}`);
}

async function get(token, outfile) {
  const workspaceId = await resolveWorkspaceId(token);
  const page = await call(token, 'GET', pagePath(workspaceId), {
    query: { content_format: 'text/md' },
  });
  const content = page.content || '';
  if (outfile) {
    writeFileSync(outfile, content);
    console.error(`wrote ${content.length} chars from "${page.name}" to ${outfile}`);
  } else {
    process.stdout.write(content);
  }
}

async function put(token, infile) {
  if (!infile) die('put requires an input file: node scripts/clickup-glossary.mjs put <infile>');
  const content = readFileSync(infile, 'utf8');
  if (!content.trim()) die(`${infile} is empty — refusing to blank the page.`);

  const workspaceId = await resolveWorkspaceId(token);
  await call(token, 'PUT', pagePath(workspaceId), {
    body: { content, content_format: 'text/md', content_edit_mode: 'replace' },
  });
  console.error(`replaced page ${PAGE_ID} with ${content.length} chars from ${infile}`);
}

const [command, arg] = process.argv.slice(2);
const token = resolveToken();

switch (command) {
  case 'whoami':
    await whoami(token);
    break;
  case 'get':
    await get(token, arg);
    break;
  case 'put':
    await put(token, arg);
    break;
  default:
    die('usage: clickup-glossary.mjs <whoami|get [outfile]|put <infile>>');
}
