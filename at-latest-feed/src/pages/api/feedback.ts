import type { APIRoute } from "astro";
import {
  getCurrentMemberLoginEmail,
  getSessionDataClient,
  hasMemberSession,
  isAllowedMemberEmail,
} from "../../lib/auth";
import type { FeedbackAction } from "../../types/trends";

export const prerender = false;

const COLLECTION_ID = "TrendReportFeedback";

const VALID_ACTIONS: FeedbackAction[] = [
  "relevant",
  "more-of-this",
  "improve-writing",
  "not-detailed-enough",
];

type TraceEntry = {
  step: string;
  status: "start" | "ok" | "error";
  detail?: unknown;
  at: string;
};

type FeedbackRow = {
  _id: string;
  trendId?: string;
  trendTitle?: string;
  action?: FeedbackAction;
  memberEmail?: string;
  _updatedDate?: Date;
};

export const GET: APIRoute = async ({ url, cookies }) => {
  const trace: TraceEntry[] = [];

  const authFailure = await requireAllowedMember(cookies, trace);
  if (authFailure) {
    return authFailure;
  }

  const trendId = url.searchParams.get("trendId")?.trim();
  if (!trendId) {
    trace.push(makeTraceEntry("validateQuery", "error", "trendId is required"));
    return jsonResponse({ ok: false, error: "trendId is required", trace }, 400);
  }
  trace.push(makeTraceEntry("validateQuery", "ok", { trendId }));

  const memberEmail = await getAllowedMemberEmail(cookies, trace);
  if (memberEmail instanceof Response) {
    return memberEmail;
  }

  try {
    const client = getRequiredSessionDataClient(cookies);
    trace.push(makeTraceEntry("items.query", "start", { collectionId: COLLECTION_ID, trendId, memberEmail }));
    const rows = await findMemberTrendFeedback(client, trendId, memberEmail);
    trace.push(makeTraceEntry("items.query", "ok", {
      count: rows.length,
      rowIds: rows.map((row) => row._id),
    }));

    const latestRow = rows[0] ?? null;
    return jsonResponse({
      ok: true,
      feedback: latestRow?.action ?? null,
      trace,
    });
  } catch (error) {
    if (isLoadFallbackRuntimeError(error)) {
      trace.push(makeTraceEntry("items.query", "error", {
        message: error instanceof Error ? error.message : "Unknown error",
        fallback: "Returning no saved feedback for initial load",
      }));
      return jsonResponse({
        ok: true,
        feedback: null,
        trace,
        warning: error instanceof Error ? error.message : "Collection unavailable",
      });
    }

    return errorResponse(error, trace, "feedback.load");
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const trace: TraceEntry[] = [];

  const authFailure = await requireAllowedMember(cookies, trace);
  if (authFailure) {
    return authFailure;
  }

  let body: { trendId?: string; trendTitle?: string; action?: string };
  try {
    trace.push(makeTraceEntry("request.json", "start"));
    body = await request.json();
    trace.push(makeTraceEntry("request.json", "ok", body));
  } catch {
    trace.push(makeTraceEntry("request.json", "error", "Invalid JSON body"));
    return jsonResponse({ ok: false, error: "Invalid JSON body", trace }, 400);
  }

  const { trendId, trendTitle, action } = body;

  if (
    !trendId ||
    !action ||
    !VALID_ACTIONS.includes(action as FeedbackAction)
  ) {
    trace.push(makeTraceEntry("validatePayload", "error", body));
    return jsonResponse({ ok: false, error: "Invalid feedback payload", trace }, 400);
  }
  trace.push(makeTraceEntry("validatePayload", "ok"));

  const memberEmail = await getAllowedMemberEmail(cookies, trace);
  if (memberEmail instanceof Response) {
    return memberEmail;
  }

  try {
    const client = getRequiredSessionDataClient(cookies);
    trace.push(makeTraceEntry("items.query", "start", { collectionId: COLLECTION_ID, trendId, memberEmail }));
    const existingRows = await findMemberTrendFeedback(client, trendId, memberEmail);
    trace.push(makeTraceEntry("items.query", "ok", {
      count: existingRows.length,
      rowIds: existingRows.map((row) => row._id),
    }));

    const primaryRow = existingRows[0] ?? null;
    const duplicateRows = existingRows.slice(1);

    if (duplicateRows.length > 0) {
      trace.push(makeTraceEntry("items.removeDuplicates", "start", {
        duplicateRowIds: duplicateRows.map((row) => row._id),
      }));
      await Promise.all(duplicateRows.map((row) => removeFeedbackRow(client, row._id)));
      trace.push(makeTraceEntry("items.removeDuplicates", "ok"));
    }

    if (primaryRow?._id) {
      trace.push(makeTraceEntry("items.update", "start", {
        itemId: primaryRow._id,
        collectionId: COLLECTION_ID,
        trendId,
        trendTitle: trendTitle ?? "",
        action,
        memberEmail,
      }));
      await updateFeedbackRow(client, {
        _id: primaryRow._id,
        trendId,
        trendTitle: trendTitle ?? "",
        action,
        memberEmail,
      });
      trace.push(makeTraceEntry("items.update", "ok", { itemId: primaryRow._id }));
      return jsonResponse({ ok: true, feedback: action, trace });
    }

    trace.push(makeTraceEntry("items.insert", "start", {
      collectionId: COLLECTION_ID,
      trendId,
      trendTitle: trendTitle ?? "",
      action,
      memberEmail,
    }));
    const createdItem = await insertFeedbackRow(client, {
      trendId,
      trendTitle: trendTitle ?? "",
      action,
      memberEmail,
    });
    trace.push(makeTraceEntry("items.insert", "ok", { itemId: createdItem._id }));
    return jsonResponse({ ok: true, feedback: action, trace });
  } catch (error) {
    return errorResponse(error, trace, "feedback.save");
  }
};

export const DELETE: APIRoute = async ({ url, cookies }) => {
  const trace: TraceEntry[] = [];

  const authFailure = await requireAllowedMember(cookies, trace);
  if (authFailure) {
    return authFailure;
  }

  const trendId = url.searchParams.get("trendId")?.trim();
  if (!trendId) {
    trace.push(makeTraceEntry("validateQuery", "error", "trendId is required"));
    return jsonResponse({ ok: false, error: "trendId is required", trace }, 400);
  }
  trace.push(makeTraceEntry("validateQuery", "ok", { trendId }));

  const memberEmail = await getAllowedMemberEmail(cookies, trace);
  if (memberEmail instanceof Response) {
    return memberEmail;
  }

  try {
    const client = getRequiredSessionDataClient(cookies);
    trace.push(makeTraceEntry("items.query", "start", { collectionId: COLLECTION_ID, trendId, memberEmail }));
    const rows = await findMemberTrendFeedback(client, trendId, memberEmail);
    trace.push(makeTraceEntry("items.query", "ok", {
      count: rows.length,
      rowIds: rows.map((row) => row._id),
    }));

    if (rows.length === 0) {
      trace.push(makeTraceEntry("items.remove", "ok", "No existing feedback row"));
      return jsonResponse({ ok: true, feedback: null, trace });
    }

    trace.push(makeTraceEntry("items.remove", "start", { rowIds: rows.map((row) => row._id) }));
    await Promise.all(rows.map((row) => removeFeedbackRow(client, row._id)));
    trace.push(makeTraceEntry("items.remove", "ok"));

    return jsonResponse({ ok: true, feedback: null, trace });
  } catch (error) {
    return errorResponse(error, trace, "feedback.clear");
  }
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function requireAllowedMember(cookies: Parameters<APIRoute>[0]["cookies"], trace: TraceEntry[]) {
  if (!hasMemberSession(cookies)) {
    trace.push(makeTraceEntry("hasMemberSession", "error", "Authentication required"));
    return jsonResponse({ ok: false, error: "Authentication required", trace }, 401);
  }

  trace.push(makeTraceEntry("hasMemberSession", "ok"));
  return null;
}

async function getAllowedMemberEmail(
  cookies: Parameters<APIRoute>[0]["cookies"],
  trace: TraceEntry[],
) {
  trace.push(makeTraceEntry("getCurrentMemberLoginEmail", "start"));
  const memberEmail = await getCurrentMemberLoginEmail(cookies);
  if (!isAllowedMemberEmail(memberEmail)) {
    trace.push(makeTraceEntry("getCurrentMemberLoginEmail", "error", {
      memberEmail,
      reason: "Forbidden",
    }));
    return jsonResponse({
      ok: false,
      error: "Forbidden",
      details: { memberEmail, reason: "Email is not an allowed @wix.com member" },
      trace,
    }, 403);
  }

  trace.push(makeTraceEntry("getCurrentMemberLoginEmail", "ok", { memberEmail }));
  return memberEmail;
}

async function findMemberTrendFeedback(
  client: NonNullable<ReturnType<typeof getSessionDataClient>>,
  trendId: string,
  memberEmail: string,
) {
  const result = await client.items.query<FeedbackRow>(COLLECTION_ID)
    .eq("trendId", trendId)
    .eq("memberEmail", memberEmail)
    .descending("_updatedDate")
    .limit(20)
    .find({ consistentRead: true, returnTotalCount: true });

  return result.items;
}

async function insertFeedbackRow(
  client: NonNullable<ReturnType<typeof getSessionDataClient>>,
  item: Omit<FeedbackRow, "_id" | "_updatedDate">,
) {
  return client.items.insert(COLLECTION_ID, item);
}

async function updateFeedbackRow(
  client: NonNullable<ReturnType<typeof getSessionDataClient>>,
  item: Required<Pick<FeedbackRow, "_id">> & Omit<FeedbackRow, "_updatedDate">,
) {
  return client.items.update(COLLECTION_ID, item);
}

async function removeFeedbackRow(
  client: NonNullable<ReturnType<typeof getSessionDataClient>>,
  itemId: string,
) {
  return client.items.remove(COLLECTION_ID, itemId);
}

function getRequiredSessionDataClient(cookies: Parameters<APIRoute>[0]["cookies"]) {
  const client = getSessionDataClient(cookies);
  if (!client) {
    throw new Error("Authentication required");
  }

  return client;
}

function errorResponse(error: unknown, trace: TraceEntry[], step: string) {
  const serializedError = serializeError(error);
  trace.push(makeTraceEntry(step, "error", serializedError));
  return jsonResponse({
    ok: false,
    error: serializedError.message ?? "Unknown error",
    details: serializedError,
    trace,
  }, 500);
}

function isLoadFallbackRuntimeError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  if (
    error.message.includes("TrendReportFeedback")
    && (
      error.message.includes("does not exist")
      || error.message.includes("is missing")
    )
  ) {
    return true;
  }

  return error.message.includes("Failed to exchange instance ID for access token");
}

function makeTraceEntry(
  step: string,
  status: TraceEntry["status"],
  detail?: unknown,
): TraceEntry {
  return {
    step,
    status,
    detail,
    at: new Date().toISOString(),
  };
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const base: Record<string, unknown> = {
      name: error.name,
      message: error.message,
    };

    if (error.stack) {
      base.stack = error.stack;
    }

    const errorWithCause = error as Error & { cause?: unknown };
    if (errorWithCause.cause !== undefined) {
      base.cause = serializeUnknown(errorWithCause.cause);
    }

    for (const [key, value] of Object.entries(error)) {
      if (!(key in base)) {
        base[key] = serializeUnknown(value);
      }
    }

    return base;
  }

  return {
    message: typeof error === "string" ? error : "Unknown error",
    value: serializeUnknown(error),
  };
}

function serializeUnknown(value: unknown): unknown {
  if (value instanceof Error) {
    return serializeError(value);
  }

  if (Array.isArray(value)) {
    return value.map(serializeUnknown);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, serializeUnknown(entryValue)]),
    );
  }

  return value;
}
