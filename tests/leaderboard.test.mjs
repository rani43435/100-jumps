import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleLeaderboard } from '../lib/leaderboard.mjs';

function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../drizzle/0000_funny_red_shift.sql', import.meta.url), 'utf8'));
  return { prepare(sql) {
    let params = [];
    return {
      bind(...values) { params = values; return this; },
      async first() { return sqlite.prepare(sql).get(...params) || null; },
      async all() { return { results: sqlite.prepare(sql).all(...params) }; },
      async run() { return sqlite.prepare(sql).run(...params); },
    };
  }};
}
function post(db, body, now, origin = 'https://game.example') {
  return handleLeaderboard(new Request('https://game.example/api/leaderboard', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body),
  }), db, now);
}
async function complete(db, start, step) {
  const response = await post(db, { action: 'start', mode: 'classic', totalJumps: 100 }, start);
  assert.equal(response.status, 201);
  const { runId } = await response.json();
  for (let progress = 1; progress <= 100; progress++) {
    const checkpoint = await post(db, { action: 'checkpoint', runId, progress, durationMs: 1 }, start + progress * step);
    assert.equal(checkpoint.status, 200);
  }
  return runId;
}

test('only completed Classic 100 runs can post; times use server checkpoints and rank fastest first', async () => {
  const db = database();
  assert.equal((await post(db, { action: 'start', mode: 'classic', totalJumps: 1 }, 100000)).status, 400);
  const start = await post(db, { action: 'start', mode: 'classic', totalJumps: 100 }, 100000);
  const { runId: incomplete } = await start.json();
  assert.equal((await post(db, { action: 'submit', runId: incomplete, name: 'Unfinished' }, 101000)).status, 409);
  assert.equal((await post(db, { action: 'checkpoint', runId: incomplete, progress: 100 }, 200000)).status, 409);
  assert.equal((await post(db, { action: 'checkpoint', runId: incomplete, progress: 1 }, 100001)).status, 409);
  const slow = await complete(db, 300000, 1000);
  const fast = await complete(db, 500000, 500);
  const first = await (await post(db, { action: 'submit', runId: slow, name: "O'Neil", durationMs: 1 }, 410000)).json();
  assert.equal(first.durationMs, 100000);
  const second = await (await post(db, { action: 'submit', runId: fast, name: 'Fast Player' }, 900000)).json();
  assert.equal(second.durationMs, 50000);
  assert.equal(second.rank, 1);
  assert.equal((await post(db, { action: 'submit', runId: fast, name: 'Fast Player' }, 900001)).status, 200);
  assert.equal((await post(db, { action: 'submit', runId: fast, name: 'Another Name' }, 900002)).status, 409);
  const list = await (await handleLeaderboard(new Request('https://game.example/api/leaderboard'), db)).json();
  assert.equal(list.total, 2);
  assert.deepEqual(list.entries.map(row => row.name), ['Fast Player', "O'Neil"]);
  assert.deepEqual(list.entries.map(row => row.durationMs), [50000, 100000]);
  assert.equal(JSON.stringify(list).includes(fast), false, 'run submission tokens must stay private');
});

test('rejects foreign origins, invalid names, and missing run IDs', async () => {
  const db = database();
  assert.equal((await post(db, { action: 'start', mode: 'classic', totalJumps: 100 }, 100000, 'https://other.example')).status, 403);
  assert.equal((await post(db, { action: 'submit', name: 'Someone' }, 100000)).status, 400);
  assert.equal((await post(db, null, 100000)).status, 400);
  const runId = await complete(db, 200000, 1000);
  for (const name of ['', '<script>', 'x'.repeat(25), 'bad\u0000name']) {
    assert.equal((await post(db, { action: 'submit', runId, name }, 400000)).status, 400);
  }
});
