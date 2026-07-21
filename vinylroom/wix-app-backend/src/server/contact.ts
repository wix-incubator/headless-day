import { ApiKeyStrategy, createClient } from "@wix/sdk";
import { forms, submissions } from "@wix/forms";
import { notes, submittedContact } from "@wix/crm";
import type { BackendConfig } from "./host-events";

type ContactInput = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
};

const FORM_NAME = "Vinyl Rooms Contact";
const FORM_NAMESPACE = "wix.form_app.form";
const PRODUCTION_ORIGINS = new Set([
  "https://vinylroom.online",
  "https://www.vinylroom.online",
]);
const requestsByAddress = new Map<string, { count: number; resetAt: number }>();
let cachedFormId = "";

function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  if (PRODUCTION_ORIGINS.has(origin)) return origin;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return "";
}

export function contactCorsHeaders(request: Request) {
  const origin = allowedOrigin(request);
  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
}

function json(request: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: contactCorsHeaders(request) });
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanEmail(value: unknown) {
  const email = cleanText(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : "";
}

function isRateLimited(request: Request) {
  const now = Date.now();
  const address = (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    "unknown"
  ).trim();
  const current = requestsByAddress.get(address);
  if (!current || current.resetAt <= now) {
    requestsByAddress.set(address, { count: 1, resetAt: now + 10 * 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 5;
}

function wixFormsClient(config: BackendConfig) {
  return createClient({
    auth: ApiKeyStrategy({ apiKey: config.apiKey, siteId: config.siteId }),
    modules: { forms, submissions, notes, submittedContact },
  }) as unknown as {
    forms: {
      queryForms: typeof forms.queryForms;
      createForm: typeof forms.createForm;
    };
    submissions: {
      createSubmission: typeof submissions.createSubmission;
    };
    notes: {
      createNote: typeof notes.createNote;
    };
    submittedContact: {
      appendOrCreateContact: typeof submittedContact.appendOrCreateContact;
    };
  };
}

async function saveContactMessage(
  client: ReturnType<typeof wixFormsClient>,
  input: { name: string; email: string; message: string },
) {
  const contact = await client.submittedContact.appendOrCreateContact({
    info: {
      name: { first: input.name },
      emails: { items: [{ email: input.email, tag: "MAIN", primary: true }] },
    },
    passThroughData: "Vinyl Rooms website contact form",
  });
  if (!contact.contactId) throw new Error("Wix Contacts did not return a contact ID.");
  await client.notes.createNote({
    contactId: contact.contactId,
    text: `Website contact message\n\n${input.message}`,
    type: "NOT_SET",
  });
}

async function resolveContactForm(client: ReturnType<typeof wixFormsClient>) {
  if (cachedFormId) return cachedFormId;
  const result = await client.forms
    .queryForms()
    .eq("namespace", FORM_NAMESPACE)
    .eq("name", FORM_NAME)
    .limit(1)
    .find();
  const existingId = result.items[0]?._id;
  if (existingId) return (cachedFormId = existingId);

  const nameId = crypto.randomUUID();
  const emailId = crypto.randomUUID();
  const messageId = crypto.randomUUID();
  const stepId = crypto.randomUUID();
  const textOptions = (label: string, placeholder: string, maxLength: number) => ({
    target: label.toLowerCase(),
    pii: true,
    required: true,
    inputType: "STRING" as const,
    stringOptions: {
      componentType: "TEXT_INPUT" as const,
      textInputOptions: { label, placeholder, showLabel: true },
      validation: { minLength: 2, maxLength },
    },
  });

  const created = await client.forms.createForm({
    namespace: FORM_NAMESPACE,
    name: FORM_NAME,
    enabled: true,
    spamFilterProtectionLevel: "BASIC",
    submissionAccess: "OWNER_AND_COLLABORATORS",
    formFields: [
      {
        _id: nameId,
        identifier: "contact_name",
        fieldType: "INPUT",
        inputOptions: textOptions("Name", "Your name", 120),
      },
      {
        _id: emailId,
        identifier: "contact_email",
        fieldType: "INPUT",
        inputOptions: {
          ...textOptions("Email", "you@example.com", 254),
          stringOptions: {
            componentType: "TEXT_INPUT",
            textInputOptions: { label: "Email", placeholder: "you@example.com", showLabel: true },
            validation: { format: "EMAIL", minLength: 3, maxLength: 254 },
          },
          contactMapping: { contactField: "EMAIL", emailInfo: { tag: "MAIN" } },
        },
      },
      {
        _id: messageId,
        identifier: "contact_message",
        fieldType: "INPUT",
        inputOptions: textOptions("Message", "How can we help?", 2000),
      },
    ],
    steps: [
      {
        _id: stepId,
        name: "Contact",
        hidden: false,
        layout: {
          large: {
            columns: 12,
            rowHeight: 48,
            items: [
              { fieldId: nameId, row: 0, column: 0, width: 6, height: 1 },
              { fieldId: emailId, row: 0, column: 6, width: 6, height: 1 },
              { fieldId: messageId, row: 1, column: 0, width: 12, height: 3 },
            ],
          },
        },
      },
    ],
    rules: [],
    formRules: [],
  });

  if (!created._id) throw new Error("Wix Forms created the contact form without returning its ID.");
  return (cachedFormId = created._id);
}

function errorMessage(error: unknown) {
  if (!(error instanceof Error)) return "Wix Forms could not save the message.";
  const details = error as Error & {
    details?: { applicationError?: { description?: string } };
  };
  return details.details?.applicationError?.description || error.message;
}

export async function handleContact(request: Request, config: BackendConfig) {
  if (request.headers.get("origin") && !allowedOrigin(request)) {
    return json(request, { error: "Origin not allowed." }, 403);
  }
  if (!config.apiKey || !config.siteId) {
    return json(request, { error: "Contact service is not configured." }, 503);
  }
  if (isRateLimited(request)) {
    return json(request, { error: "Too many attempts. Please try again in a few minutes." }, 429);
  }

  let input: ContactInput;
  try {
    input = (await request.json()) as ContactInput;
  } catch {
    return json(request, { error: "Complete every contact field." }, 400);
  }
  const name = cleanText(input.name, 120);
  const email = cleanEmail(input.email);
  const message = cleanText(input.message, 2000);
  if (name.length < 2 || !email || message.length < 10) {
    return json(request, { error: "Enter your name, a valid email, and a message of at least 10 characters." }, 400);
  }

  try {
    const client = wixFormsClient(config);
    const formId = await resolveContactForm(client);
    await client.submissions.createSubmission({
      formId,
      submissions: { name, email, message },
    });
    return json(request, {
      ok: true,
      message: "Message received. We’ll get back to you soon.",
      storage: "wix-forms",
    });
  } catch (error) {
    const messageText = errorMessage(error);
    console.error("contact submission failed", { message: messageText });
    if (/unsupported namespace|UNSUPPORTED_FORM_NAMESPACE/i.test(messageText)) {
      try {
        await saveContactMessage(wixFormsClient(config), { name, email, message });
        return json(request, {
          ok: true,
          message: "Message received. We’ll get back to you soon.",
          storage: "wix-contacts",
        });
      } catch (fallbackError) {
        console.error("contact CRM fallback failed", { message: errorMessage(fallbackError) });
      }
    }
    return json(request, { error: "Could not send the message right now. Please try again." }, 502);
  }
}
