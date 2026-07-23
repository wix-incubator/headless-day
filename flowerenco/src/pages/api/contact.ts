import type { APIRoute } from "astro";
import { submissions } from "@wix/forms";
import { items } from "@wix/data";
import { auth } from "@wix/essentials";

const FORM_ID = "130a0af6-8911-49cf-b012-7ec597521721";
const MESSAGES_COLLECTION = "StudioMessages";

function json(o: any, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    if (!data?.first_name || !data?.email || !data?.message) {
      return json({ error: "Please fill in your name, email and message." }, 400);
    }

    let saved = false;

    // Save the full inquiry (incl. the message) to a data collection the owner reads in Content Manager.
    try {
      const insert = auth.elevate(items.insert);
      await insert(MESSAGES_COLLECTION, {
        name: data.first_name,
        email: data.email,
        phone: data.phone || "",
        message: data.message,
        submittedAt: new Date().toISOString(),
      });
      saved = true;
    } catch (e) {
      /* non-fatal — fall through to the form submission */
    }

    // Also create a form submission so the sender lands in Contacts / CRM.
    try {
      const submission: Record<string, any> = {
        first_name: data.first_name,
        email: data.email,
        message: data.message,
      };
      if (data.phone) submission.phone = data.phone;
      await submissions.createSubmission({ formId: FORM_ID, submissions: submission });
      saved = true;
    } catch (e) {
      /* non-fatal if the collection write already succeeded */
    }

    if (!saved) return json({ error: "Could not send your message. Please try again." }, 500);
    return json({ ok: true });
  } catch (e: any) {
    return json({ error: e?.message || "Could not send your message." }, 500);
  }
};
