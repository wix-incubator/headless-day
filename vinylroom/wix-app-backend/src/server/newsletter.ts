import { ApiKeyStrategy, createClient } from "@wix/sdk";
import { forms, submissions } from "@wix/forms";
import { labels, submittedContact } from "@wix/crm";
import type { BackendConfig } from "./host-events";

type NewsletterInput = { email?: unknown };

const FORM_NAME = "Vinyl Rooms Newsletter";
const FORM_NAMESPACE = "wix.form_app.form";
const EMAIL_TARGET = "email";
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

export function newsletterCorsHeaders(request: Request) {
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
  return new Response(JSON.stringify(data), { status, headers: newsletterCorsHeaders(request) });
}

function validEmail(value: unknown) {
  if (typeof value !== "string") return "";
  const email = value.trim().toLowerCase().slice(0, 254);
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
  if (requestsByAddress.size > 500) {
    for (const [key, entry] of requestsByAddress) {
      if (entry.resetAt <= now) requestsByAddress.delete(key);
    }
  }
  return current.count > 5;
}

function wixFormsClient(config: BackendConfig) {
  return createClient({
    auth: ApiKeyStrategy({ apiKey: config.apiKey, siteId: config.siteId }),
    modules: { forms, submissions, labels, submittedContact },
  }) as unknown as {
    forms: {
      queryForms: typeof forms.queryForms;
      createForm: typeof forms.createForm;
    };
    submissions: {
      createSubmission: typeof submissions.createSubmission;
    };
    labels: {
      findOrCreateLabel: typeof labels.findOrCreateLabel;
    };
    submittedContact: {
      appendOrCreateContact: typeof submittedContact.appendOrCreateContact;
    };
  };
}

async function saveNewsletterContact(client: ReturnType<typeof wixFormsClient>, email: string) {
  const result = await client.labels.findOrCreateLabel("Vinyl Rooms Newsletter");
  const labelKey = result.label?.key;
  await client.submittedContact.appendOrCreateContact({
    info: {
      emails: { items: [{ email, tag: "MAIN", primary: true }] },
      ...(labelKey ? { labelKeys: { items: [labelKey] } } : {}),
    },
    passThroughData: "Vinyl Rooms newsletter signup",
  });
}

async function resolveNewsletterForm(client: ReturnType<typeof wixFormsClient>, configuredId = "") {
  if (configuredId) return configuredId;
  if (cachedFormId) return cachedFormId;

  const result = await client.forms
    .queryForms()
    .eq("namespace", FORM_NAMESPACE)
    .eq("name", FORM_NAME)
    .limit(1)
    .find();
  const existingId = result.items[0]?._id;
  if (existingId) {
    cachedFormId = existingId;
    return existingId;
  }

  const emailFieldId = crypto.randomUUID();
  const stepId = crypto.randomUUID();
  const created = await client.forms.createForm({
    namespace: FORM_NAMESPACE,
    name: FORM_NAME,
    enabled: true,
    spamFilterProtectionLevel: "BASIC",
    submissionAccess: "OWNER_AND_COLLABORATORS",
    formFields: [
      {
        _id: emailFieldId,
        identifier: "newsletter_email",
        fieldType: "INPUT",
        inputOptions: {
          target: EMAIL_TARGET,
          pii: true,
          required: true,
          inputType: "STRING",
          stringOptions: {
            componentType: "TEXT_INPUT",
            textInputOptions: {
              label: "Email address",
              placeholder: "you@example.com",
              showLabel: true,
            },
            validation: { format: "EMAIL", minLength: 3, maxLength: 254 },
          },
          contactMapping: { contactField: "EMAIL", emailInfo: { tag: "MAIN" } },
        },
      },
    ],
    steps: [
      {
        _id: stepId,
        name: "Newsletter signup",
        hidden: false,
        layout: {
          large: {
            columns: 12,
            rowHeight: 48,
            items: [{ fieldId: emailFieldId, row: 0, column: 0, width: 12, height: 1 }],
          },
        },
      },
    ],
    rules: [],
    formRules: [],
  });

  if (!created._id) throw new Error("Wix Forms created the newsletter without returning its ID.");
  cachedFormId = created._id;
  return cachedFormId;
}

function errorMessage(error: unknown) {
  if (!(error instanceof Error)) return "Wix Forms could not save the subscription.";
  const details = error as Error & {
    details?: { applicationError?: { description?: string; code?: string | number } };
  };
  return details.details?.applicationError?.description || error.message;
}

export async function handleNewsletter(
  request: Request,
  config: BackendConfig & { newsletterFormId?: string },
) {
  if (request.headers.get("origin") && !allowedOrigin(request)) {
    return json(request, { error: "Origin not allowed." }, 403);
  }
  if (!config.apiKey || !config.siteId) {
    return json(request, { error: "Newsletter service is not configured." }, 503);
  }
  if (isRateLimited(request)) {
    return json(request, { error: "Too many attempts. Please try again in a few minutes." }, 429);
  }

  let input: NewsletterInput;
  try {
    input = (await request.json()) as NewsletterInput;
  } catch {
    return json(request, { error: "Enter a valid email address." }, 400);
  }
  const email = validEmail(input.email);
  if (!email) return json(request, { error: "Enter a valid email address." }, 400);

  try {
    const client = wixFormsClient(config);
    const formId = await resolveNewsletterForm(client, config.newsletterFormId?.trim());
    await client.submissions.createSubmission({
      formId,
      submissions: { [EMAIL_TARGET]: email },
    });
    return json(request, {
      ok: true,
      message: "You’re on the list. See you at the next room.",
      storage: "wix-forms",
    });
  } catch (error) {
    const message = errorMessage(error);
    console.error("newsletter submission failed", { message });
    if (/unsupported namespace|UNSUPPORTED_FORM_NAMESPACE/i.test(message)) {
      try {
        await saveNewsletterContact(wixFormsClient(config), email);
        return json(request, {
          ok: true,
          message: "You’re on the list. See you at the next room.",
          storage: "wix-contacts",
        });
      } catch (fallbackError) {
        console.error("newsletter contact fallback failed", { message: errorMessage(fallbackError) });
      }
    }
    if (/permission|forbidden|403/i.test(message)) {
      return json(request, {
        error: "Wix Forms permissions are missing. Enable WIX_FORMS.FORM_SCHEMA_CREATE and WIX_FORMS.SUBMISSION_CREATE.",
      }, 503);
    }
    return json(request, { error: "Could not subscribe right now. Please try again." }, 502);
  }
}
