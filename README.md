# 100 Jumps

A public game with custom jump goals and a shared leaderboard for Classic games with exactly 100 jumps. The original game rendering, controls, and physics are retained. Public rankings use display names and list the fastest 50 completed runs.

## Runtime

Sites Vinext/Cloudflare Worker with D1 binding `DB`. The database schema and immutable SQL migrations are in `db/` and `drizzle/`. Source game files live in `public/`; `dist/` is generated.

## Leaderboard

The timer starts on the first charge, includes pauses, and stops on the final landing. The server records start/checkpoint times, requires progress through 100 platforms, rejects large or implausibly fast progress jumps, and accepts one named result per completed run. The time is fixed before name entry. Custom goals and Extreme mode do not submit ranked results. Run tokens are excluded from public API responses; display names and times are public. This is a casual leaderboard without account-based identity or authoritative physics replay.

## Validate

- `node --test tests/settings.test.mjs tests/leaderboard.test.mjs tests/leaderboard-client.test.mjs`
- `npx tsc --noEmit`
- Build through the Sites skill's `scripts/build-site.mjs`.
- Apply pending local SQL migrations using the generated `dist/server/wrangler.json`, then `npm start -- --port 4173`.

Local preview data is separate from the production database. Sites applies packaged migrations during publication.

## Customization

The Settings studio provides color pickers and hex inputs for 12 scene/interface colors, five theme presets, character styling, jump physics, platform spacing and geometry, camera controls, life rules, audio, and display preferences. Drafts have a live preview; Save applies them, Cancel discards them, and Restore defaults resets the draft. Gameplay pauses while Settings is open; the ranked clock continues to include pauses.

Appearance changes keep the current run. Changing gameplay rules restarts it and stores statistics separately. Ranked games require the original gameplay settings and a 100-jump goal; the leaderboard's new-game button restores those rules while preserving cosmetic/audio preferences.

## Mystery goal

Settings → Gameplay supports a fixed goal or a Mystery goal with inclusive From/To bounds (1–10,000). Each new run samples a fresh integer. Refresh preserves the existing sampled target. The target is hidden in the HUD, settings preview, end screens, level labels, and stats. Mystery stats aggregate by range and gameplay rules; mystery runs never enter the Classic leaderboard, including when the sampled target is 100.

The Show run timer switch is in Gameplay. Disabling it hides the in-game clock and finish-screen elapsed time while retaining internal timing.
