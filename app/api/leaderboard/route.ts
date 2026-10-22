import { env } from "cloudflare:workers";
import { handleLeaderboard } from "../../../lib/leaderboard.mjs";
export const dynamic = "force-dynamic";
async function handle(request: Request) {
  try {
    if (!env.DB) return Response.json({error: "The leaderboard is temporarily unavailable."}, {status: 503});
    return await handleLeaderboard(request, env.DB);
  } catch (error) {
    console.error("Leaderboard request failed", error);
    return Response.json({error: "The leaderboard is temporarily unavailable. Please try again."}, {status: 503});
  }
}
export const GET = handle;
export const POST = handle;
