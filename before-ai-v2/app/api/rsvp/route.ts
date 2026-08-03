import {
  createWixRsvp,
  getWixErrorMessage,
  getWixErrorStatus,
} from "../../wix-events";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const eventId = getString(body?.eventId);
  const firstName = getString(body?.firstName);
  const lastName = getString(body?.lastName);
  const email = getString(body?.email);

  if (!eventId || !firstName || !lastName || !email) {
    return Response.json(
      { error: "Event, first name, last name, and email are required." },
      { status: 400 },
    );
  }

  try {
    const result = await createWixRsvp({ eventId, firstName, lastName, email });

    return Response.json(result);
  } catch (error) {
    console.error("Failed to create Wix RSVP", error);

    if (getWixErrorStatus(error) === 403) {
      return Response.json(
        {
          error:
            "Wix rejected the RSVP because this key can read events but cannot create RSVPs. Add the WIX_EVENTS.CREATE_RSVP permission to the Wix API key, then try again.",
        },
        { status: 403 },
      );
    }

    const wixMessage = getWixErrorMessage(error);

    if (wixMessage) {
      return Response.json({ error: wixMessage }, { status: 400 });
    }

    return Response.json(
      { error: "Wix Events could not accept this RSVP yet." },
      { status: 502 },
    );
  }
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
