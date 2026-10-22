import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const leaderboardRuns = sqliteTable("leaderboard_runs", {
  id: text("id").primaryKey(),
  startedAt: integer("started_at").notNull(),
  lastCheckpointAt: integer("last_checkpoint_at").notNull(),
  progress: integer("progress").notNull().default(0),
  finishedAt: integer("finished_at"),
  durationMs: integer("duration_ms"),
  displayName: text("display_name"),
  submittedAt: integer("submitted_at"),
}, (table) => [index("leaderboard_finish_order").on(table.durationMs, table.finishedAt)]);
