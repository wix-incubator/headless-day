import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { mergeTopScores, parseTopJson, scoreRowId, validateSquidResult } from "../../lib/squid/scores";
import type { ScoreEntry } from "../../lib/squid/scores";
import { createAdminCollection, isMissingCollection, withCollection } from "../../lib/wix/wixData";

const COLLECTION_ID = "GameScores";

const ensureCollection = () =>
  createAdminCollection(COLLECTION_ID, "Game Scores", ["gameId", "stageId", "topJson"]);

const bad = (status: number) => new Response(null, { status });

/**
 * Trusted squid score write: the round HOST posts { stageId, timeMs, playerNames[] } on finish.
 * Server validates (stage allowlist + sanity bounds) and merges into the per-stage top-10 doc
 * with elevated creds — clients never write Wix Data directly. The route is unauthenticated:
 * ANY client that knows the URL can post bounded times, not just the round host — accepted for
 * casual play (same posture as the roadmap's match-result route).
 */
export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return bad(400);
  }
  const result = validateSquidResult(body);
  if (!result) return bad(400);

  const entry: ScoreEntry = { timeMs: result.timeMs, names: result.names, at: new Date().toISOString() };
  const _id = scoreRowId(result.stageId);

  // A missing row is the legitimate "no scores yet" case (also covers the very first score,
  // where the collection itself doesn't exist yet — isMissingCollection's "not found"-style
  // pattern matches that too) and reads as []. Any OTHER read error (throttle, network, ...)
  // must abort the POST below rather than let the merge silently overwrite the board with
  // just this one entry.
  let top: ScoreEntry[];
  try {
    const item = await auth.elevate(items.getDataItem)(_id, { dataCollectionId: COLLECTION_ID });
    top = parseTopJson(item?.data?.topJson);
  } catch (e) {
    if (!isMissingCollection(e)) return bad(500);
    top = [];
  }

  const save = (merged: ScoreEntry[]) =>
    auth.elevate(items.saveDataItem)({
      dataCollectionId: COLLECTION_ID,
      dataItem: { _id, data: { _id, gameId: "squid", stageId: result.stageId, topJson: JSON.stringify(merged) } },
    });

  try {
    await withCollection(() => save(mergeTopScores(top, entry)), ensureCollection);
  } catch {
    return bad(500);
  }
  return new Response(null, { status: 204 });
};
