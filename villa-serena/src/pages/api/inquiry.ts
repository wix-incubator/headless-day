import type { APIRoute } from "astro";
import { submissions } from "@wix/forms";

const FORM_ID = "5be341d6-9b50-4a9c-adfb-aac954b4920c";
const TARGETS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "check_in",
  "check_out",
  "guests",
  "message",
] as const;

export const POST: APIRoute = async ({ request }) => {
  const json = (body: object, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request body" }, 400);
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return json({ ok: false, error: "Invalid request body" }, 400);
  }

  const values: Record<string, string> = {};
  for (const target of TARGETS) {
    const v = data[target];
    if (v != null && String(v).trim() !== "") values[target] = String(v).trim();
  }

  for (const required of ["first_name", "last_name", "email", "check_in", "check_out", "guests"]) {
    if (!values[required]) return json({ ok: false, error: `Missing field: ${required}` }, 400);
  }

  try {
    const result = await submissions.createSubmission({
      formId: FORM_ID,
      submissions: values,
    });
    return json({ ok: true, id: result._id }, 200);
  } catch (e) {
    console.error("Inquiry submission failed", e);
    return json({ ok: false, error: "Submission failed — please try again." }, 502);
  }
};
