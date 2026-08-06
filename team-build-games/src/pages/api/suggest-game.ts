import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { getSessionMember } from "../../lib/wix/members";
import { createAdminCollection, withCollection } from "../../lib/wix/wixData";

const COLLECTION_ID = "GameSuggestions";
const TITLE_RANGE = { min: 3, max: 80 };
const PITCH_RANGE = { min: 10, max: 1000 };

const ensureCollection = () =>
  createAdminCollection(COLLECTION_ID, "Game Suggestions", [
    "title",
    "pitch",
    "memberId",
    "memberName",
    "memberEmail",
    "status",
  ]);

/**
 * Trusted "pitch a game" write (the mystery cabinet). A signed-in member POSTs the
 * suggestion form; we validate and insert into the `GameSuggestions` collection with
 * elevated app creds — clients never write Wix Data directly. Member-only by design:
 * a pitch should carry a name, so ideas can be credited (anonymous play is unaffected).
 */
export const POST: APIRoute = async ({ request, redirect }) => {
  // 1) must be a signed-in member — the form is login-gated, so this only trips on expired sessions
  const member = await getSessionMember();
  if (!member) return redirect("/suggest?error=auth", 303);

  // 2) parse + validate the form
  let title = "";
  let pitch = "";
  try {
    const form = await request.formData();
    title = String(form.get("title") ?? "").trim();
    pitch = String(form.get("pitch") ?? "").trim();
  } catch {
    return redirect("/suggest?error=input", 303);
  }
  if (title.length < TITLE_RANGE.min || title.length > TITLE_RANGE.max) {
    return redirect("/suggest?error=input", 303);
  }
  if (pitch.length < PITCH_RANGE.min || pitch.length > PITCH_RANGE.max) {
    return redirect("/suggest?error=input", 303);
  }

  // 3) elevated insert; on the very first pitch the collection may not exist yet — create + retry once
  try {
    await withCollection(
      () =>
        auth.elevate(items.insertDataItem)({
          dataCollectionId: COLLECTION_ID,
          dataItem: {
            data: {
              title,
              pitch,
              memberId: member.id,
              memberName: member.name,
              memberEmail: member.email ?? "",
              status: "new",
            },
          },
        }),
      ensureCollection,
    );
  } catch {
    return redirect("/suggest?error=save", 303);
  }

  return redirect("/suggest?sent=1", 303);
};
