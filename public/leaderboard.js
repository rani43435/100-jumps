/* Public leaderboard: runs are timed and checkpointed by the server. */
var ranking = {
    run: null, startedAt: 0, stoppedMs: null, open: false,
    format: function (ms) {
        var hundredths = Math.floor(Math.max(0, ms) / 10);
        return Math.floor(hundredths / 6000) + ':' + String(Math.floor(hundredths / 100) % 60).padStart(2, '0') + '.' + String(hundredths % 100).padStart(2, '0');
    },
    eligible: function () { return GAMEPLAY.totalJumps === 100 && activeLevel === 0 && GameSettings.isRanked(settings); },
    api: async function (body) {
        var controller = new AbortController();
        var timeout = setTimeout(function () { controller.abort(); }, 12000);
        try {
            var response = await fetch('/api/leaderboard', body ? {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body), signal: controller.signal
            } : { cache: 'no-store', signal: controller.signal });
            var data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not reach the leaderboard. Try again.');
            return data;
        } catch (error) {
            throw new Error(error.name === 'AbortError' ? 'The leaderboard timed out. Please try again.' : error.message);
        } finally { clearTimeout(timeout); }
    },
    reset: function () {
        ranking.run = null; ranking.startedAt = 0; ranking.stoppedMs = null;
        document.getElementById('ranked-finish').hidden = true;
    },
    start: function () {
        if (ranking.startedAt) return;
        ranking.startedAt = Date.now();
        if (!ranking.eligible() || player.platIdx !== 0) return;
        var run = { id: null, progress: 0, durationMs: null, submitted: false, error: null };
        ranking.run = run;
        run.queue = ranking.api({ action: 'start', mode: 'classic', totalJumps: 100 }).then(function (data) {
            run.id = data.runId;
            if (ranking.run === run) saveState();
        }).catch(function (error) { run.error = error.message; });
    },
    checkpoint: function (progress) {
        var run = ranking.run;
        if (!run || !ranking.eligible()) return;
        run.queue = run.queue.then(function () {
            if (run.error) throw new Error(run.error);
            return ranking.api({ action: 'checkpoint', runId: run.id, progress: Math.min(100, progress) });
        }).then(function (data) {
            run.progress = data.progress; run.durationMs = data.durationMs;
            if (ranking.run === run) saveState();
        }).catch(function (error) { run.error = error.message; });
    },
    elapsed: function () { return ranking.stoppedMs === null ? (ranking.startedAt ? Date.now() - ranking.startedAt : 0) : ranking.stoppedMs; },
    snapshot: function () {
        var run = ranking.run;
        return { startedAt: ranking.startedAt, stoppedMs: ranking.stoppedMs,
            run: run && { id: run.id, progress: run.progress, durationMs: run.durationMs, submitted: run.submitted, error: run.error } };
    },
    restore: function (saved) {
        ranking.reset();
        if (!saved) return;
        ranking.startedAt = saved.startedAt || 0; ranking.stoppedMs = saved.stoppedMs == null ? null : saved.stoppedMs;
        if (saved.run && saved.run.id) { ranking.run = saved.run; ranking.run.queue = Promise.resolve(); }
    },
    finish: function () {
        if (ranking.stoppedMs === null) ranking.stoppedMs = ranking.elapsed();
        var section = document.getElementById('ranked-finish');
        var status = document.getElementById('ranked-finish-status');
        var fields = document.getElementById('ranked-name-fields');
        section.hidden = false; fields.hidden = true;
        mSub.textContent = (settings.showTimer ? ranking.format(ranking.elapsed()) + ' · ' : '') + attempts.active + (attempts.active === 1 ? ' attempt' : ' attempts');
        if (settings.goalMode === 'mystery') { status.textContent = 'Your mystery target stays secret. Mystery runs are not ranked.'; return; }
        if (!ranking.eligible()) { status.textContent = 'Only Classic games with exactly 100 jumps and default gameplay rules appear on the leaderboard.'; return; }
        var run = ranking.run;
        if (!run) { status.textContent = 'Start a new 100-jump game to record a ranked time.'; return; }
        status.textContent = 'Recording your finish…';
        if (!run.durationMs && !run.error) ranking.checkpoint(100);
        run.queue.then(function () {
            if (ranking.run !== run) return;
            if (run.error || !run.durationMs) { status.textContent = 'Your finish could not be recorded online. ' + (run.error || 'Please start a new game.'); return; }
            ranking.stoppedMs = run.durationMs;
            mSub.textContent = (settings.showTimer ? ranking.format(run.durationMs) + ' · ' : '') + attempts.active + (attempts.active === 1 ? ' attempt' : ' attempts');
            if (run.submitted) { status.textContent = 'Your result is on the public leaderboard.'; return; }
            status.textContent = 'Add a display name to post your time publicly.';
            fields.hidden = false;
            document.getElementById('ranked-submit').disabled = false;
            document.getElementById('ranked-submit').textContent = 'Post my time';
            try { document.getElementById('leaderboard-name').value = localStorage.getItem('100j_player_name') || ''; } catch (_) {}
            saveState();
        });
    },
    refresh: async function () {
        var list = document.getElementById('leaderboard-list');
        var status = document.getElementById('leaderboard-status');
        var refresh = document.getElementById('leaderboard-refresh');
        list.replaceChildren(); status.textContent = 'Loading finishes…'; refresh.disabled = true;
        try {
            var data = await ranking.api();
            status.textContent = data.entries.length ? data.total + (data.total === 1 ? ' finish' : ' finishes') + ' · fastest 50 shown' : 'No finishes yet. Be the first to complete all 100 jumps!';
            data.entries.forEach(function (entry, index) {
                var row = document.createElement('div'); row.className = 'lb-row'; row.setAttribute('role', 'listitem');
                var rank = document.createElement('span'); rank.className = 'lb-rank'; rank.textContent = index + 1;
                var name = document.createElement('div'); name.className = 'lb-name'; name.textContent = entry.name;
                var date = document.createElement('span'); date.className = 'lb-date'; date.textContent = new Date(entry.finishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); name.appendChild(date);
                var time = document.createElement('span'); time.className = 'lb-time'; time.textContent = ranking.format(entry.durationMs);
                row.append(rank, name, time); list.appendChild(row);
            });
        } catch (error) { status.textContent = error.message; }
        finally { refresh.disabled = false; }
    },
    show: function () {
        ranking.open = true;
        var overlay = document.getElementById('leaderboard-overlay'); overlay.inert = false; overlay.classList.add('show');
        document.getElementById('leaderboard-close').focus();
        ranking.refresh();
    },
    close: function () {
        ranking.open = false;
        var overlay = document.getElementById('leaderboard-overlay'); overlay.classList.remove('show'); overlay.inert = true;
        document.getElementById('leaderboard-btn').focus();
    },
    newGame: function () {
        ranking.close();
        settings = GameSettings.withDefaultRules(settings); applyRuntimeSettings(); saveSettings();
        document.getElementById('jump-count').value = 100;
        settingsOpen = false; statsOpen = false;
        settingsOverlay.classList.remove('show'); statsOverlay.classList.remove('show');
        hideLevelSelect(); stopOmtCountdown(); omtOverlay.classList.remove('show');
        winModalOpen = false; loadLevelStats(0); restart(); saveState();
    }
};

document.getElementById('leaderboard-btn').addEventListener('click', function (e) { e.stopPropagation(); ranking.show(); });
document.getElementById('leaderboard-refresh').addEventListener('click', ranking.refresh);
document.getElementById('leaderboard-close').addEventListener('click', ranking.close);
document.getElementById('leaderboard-play').addEventListener('click', ranking.newGame);
document.getElementById('leaderboard-overlay').addEventListener('click', function (e) { if (e.target === this) ranking.close(); });
document.getElementById('leaderboard-overlay').addEventListener('touchmove', function (e) { e.stopPropagation(); }, { passive: true });
document.querySelector('#modal .card').addEventListener('touchmove', function (e) { e.stopPropagation(); }, { passive: true });
document.getElementById('ranked-name-fields').addEventListener('submit', async function (e) {
    e.preventDefault(); e.stopPropagation();
    var run = ranking.run;
    if (!run || !run.durationMs || run.submitted) return;
    var button = document.getElementById('ranked-submit');
    var status = document.getElementById('ranked-finish-status');
    var name = document.getElementById('leaderboard-name').value.trim();
    if (!name) { status.textContent = 'Enter a display name first.'; return; }
    button.disabled = true; button.textContent = 'Posting…';
    try {
        var result = await ranking.api({ action: 'submit', runId: run.id, name: name });
        run.submitted = true;
        try { localStorage.setItem('100j_player_name', result.name); } catch (_) {}
        if (ranking.run !== run) return;
        status.textContent = 'Posted! You are #' + result.rank + ' with a time of ' + ranking.format(result.durationMs) + '.';
        document.getElementById('ranked-name-fields').hidden = true;
        saveState();
    } catch (error) {
        if (ranking.run !== run) return;
        status.textContent = error.message; button.disabled = false; button.textContent = 'Try posting again';
    }
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ranking.open) { e.preventDefault(); ranking.close(); } });
