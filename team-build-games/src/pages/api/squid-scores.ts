import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { parseTopJson, scoreRowId } from "../../lib/squid/scores";
import { STAGES } from "../../game/squid/stage";
import type { StageId } from "../../game/squid/stage";

const COLLECTION_ID = "GameScores";

/** Public read of a stage's top-10 (the waiting-room dashboard). */
export const GET: APIRoute = async ({ url }) => {
  const stage = url.searchParams.get("stage");
  if (!STAGES.some((s) => s.id === stage)) {
    return new Response(JSON.stringify({ error: "unknown stage" }), { status: 400 });
  }
  let scores: unknown[] = [];
  try {
    const item = await auth.elevate(items.getDataItem)(scoreRowId(stage as StageId), {
      dataCollectionId: COLLECTION_ID,
    });
    scores = parseTopJson(item?.data?.topJson);
  } catch {
    scores = []; // no scores yet (or transient) — empty dashboard, never an error page
  }
  return new Response(JSON.stringify({ scores }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};
