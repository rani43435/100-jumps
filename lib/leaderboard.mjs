const headers = { 'Cache-Control': 'no-store' };
function json(value, status = 200) { return Response.json(value, { status, headers }); }
const fail = (message, status = 400) => json({ error: message }, status);

export async function handleLeaderboard(request, db, now = Date.now()) {
  if (request.method === 'GET') {
    const rows = await db.prepare(`SELECT display_name AS name, duration_ms AS durationMs,
      finished_at AS finishedAt FROM leaderboard_runs WHERE display_name IS NOT NULL
      ORDER BY duration_ms ASC, finished_at ASC, id ASC LIMIT 50`).all();
    const count = await db.prepare('SELECT COUNT(*) AS total FROM leaderboard_runs WHERE display_name IS NOT NULL').first();
    return json({ entries: rows.results, total: count.total });
  }
  if (request.method !== 'POST') return fail('Method not allowed.', 405);
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return fail('Use the game website to submit a result.', 403);
  if (!request.headers.get('Content-Type')?.includes('application/json')) return fail('JSON is required.', 415);
  const raw = await request.text();
  if (raw.length > 2048) return fail('Request is too large.', 413);
  let body;
  try { body = JSON.parse(raw); } catch { return fail('Invalid request.'); }
  if (!body || typeof body !== 'object') return fail('Invalid request.');

  if (body.action === 'start') {
    if (body.mode !== 'classic' || body.totalJumps !== 100) return fail('Only Classic 100-jump games are ranked.');
    const id = crypto.randomUUID();
    await db.prepare(`INSERT INTO leaderboard_runs (id, started_at, last_checkpoint_at, progress)
      VALUES (?, ?, ?, 0)`).bind(id, now, now).run();
    return json({ runId: id }, 201);
  }
  if (!['checkpoint', 'submit'].includes(body.action)) return fail('Unknown action.');
  if (typeof body.runId !== 'string' || !/^[0-9a-f-]{36}$/.test(body.runId)) return fail('Invalid run.');
  let run = await db.prepare('SELECT * FROM leaderboard_runs WHERE id = ?').bind(body.runId).first();
  if (!run) return fail('This run could not be found. Start a new game.', 404);

  if (body.action === 'checkpoint') {
    const progress = body.progress;
    if (!Number.isInteger(progress) || progress < 1 || progress > 100) return fail('Invalid jump progress.');
    if (progress <= run.progress) return json({ progress: run.progress, durationMs: run.duration_ms });
    if (run.finished_at || now - run.started_at > 86400000) return fail('This run has ended.', 409);
    const advance = progress - run.progress;
    if (advance > 6 || now - run.last_checkpoint_at < advance * 150) return fail('Jump progress could not be recorded.', 409);
    const finishedAt = progress === 100 ? now : null;
    const durationMs = finishedAt === null ? null : now - run.started_at;
    await db.prepare(`UPDATE leaderboard_runs SET progress = ?, last_checkpoint_at = ?, finished_at = ?, duration_ms = ?
      WHERE id = ? AND progress = ? AND finished_at IS NULL`)
      .bind(progress, now, finishedAt, durationMs, run.id, run.progress).run();
    run = await db.prepare('SELECT * FROM leaderboard_runs WHERE id = ?').bind(run.id).first();
    return json({ progress: run.progress, durationMs: run.duration_ms });
  }

  if (run.progress !== 100 || !run.finished_at || !run.duration_ms) return fail('Complete all 100 jumps before posting a result.', 409);
  const name = typeof body.name === 'string' ? body.name.normalize('NFKC').replace(/\s+/gu, ' ').trim() : '';
  if (Array.from(name).length < 1 || Array.from(name).length > 24 || /[\p{Cc}\p{Cf}<>]/u.test(name)) return fail('Use a display name with 1–24 characters.');
  if (run.display_name && run.display_name !== name) return fail('This result has already been posted.', 409);
  await db.prepare('UPDATE leaderboard_runs SET display_name = ?, submitted_at = ? WHERE id = ? AND display_name IS NULL')
    .bind(name, now, run.id).run();
  const rank = await db.prepare(`SELECT COUNT(*) + 1 AS rank FROM leaderboard_runs WHERE display_name IS NOT NULL AND
    (duration_ms < ? OR (duration_ms = ? AND finished_at < ?) OR (duration_ms = ? AND finished_at = ? AND id < ?))`)
    .bind(run.duration_ms, run.duration_ms, run.finished_at, run.duration_ms, run.finished_at, run.id).first();
  return json({ name, durationMs: run.duration_ms, rank: rank.rank });
}
