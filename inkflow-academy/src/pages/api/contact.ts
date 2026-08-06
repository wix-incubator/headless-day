import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { submittedContact, notes } from "@wix/crm";
import { json } from "../../lib/json";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";
    const message =
      typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "General enquiry";
    const courses = Array.isArray(body.courses)
      ? body.courses.filter((c): c is string => typeof c === "string").slice(0, 10)
      : [];

    if (!EMAIL_RE.test(email)) return json({ error: "Please add a valid email." }, 400);

    const parts = name.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || "Visitor";
    const lastName = parts.slice(1).join(" ") || "";

    const contact = await auth.elevate(submittedContact.appendOrCreateContact)({
      info: {
        name: { first: firstName, ...(lastName ? { last: lastName } : {}) },
        emails: { items: [{ email, primary: true }] },
      },
      passThroughData: "Inkflow Academy website",
    });

    const contactId = contact.contactId;
    if (contactId) {
      const lines = [
        courses.length ? `Courses: ${courses.join(", ")}` : null,
        message,
      ].filter(Boolean);
      await auth.elevate(notes.createNote)({
        contactId,
        text: lines.join("\n\n"),
        type: "NOT_SET",
      });
    }

    return json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "contact failed";
    return json({ error: message }, 500);
  }
};
