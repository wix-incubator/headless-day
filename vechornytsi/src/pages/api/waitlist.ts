import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { sendSms, waitlistJoinedMessage } from "../../lib/notify";

export const prerender = false;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Join a dinner's waitlist: persist to the Waitlist CMS collection, then fire the
// confirmation SMS (stubbed until TWILIO_* is set — see src/lib/notify.ts).
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, string>;
    const { name, email, phone, dinnerSlug = "", dinnerTitle = "" } = body ?? {};

    if (!name || !email || !phone) {
      return json({ ok: false, error: "Name, email and phone are required." }, 400);
    }

    await items.insert("Waitlist", {
      name,
      email,
      phone,
      dinnerSlug,
      dinnerTitle,
      notified: false,
    });

    const sms = await sendSms(phone, waitlistJoinedMessage(dinnerTitle || "an upcoming dinner"));

    return json({ ok: true, smsSent: sms.sent, smsReason: sms.reason });
  } catch (err) {
    console.error("[api:waitlist]", err);
    return json({ ok: false, error: "Could not join the waitlist just now. Please try again." }, 500);
  }
};
