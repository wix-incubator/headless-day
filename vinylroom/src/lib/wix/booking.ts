import { getBrowserClient } from "./browser";
import { routeUrl } from "@/lib/site";
import { type Room } from "@/data/rooms";
import { ordersCompat } from "./ordersCompat";
import { redirectsCompat } from "./sdkCompat";

export type CheckoutResult =
  | { status: "redirect"; url: string }
  | { status: "demo"; reason: string }
  | { status: "error"; reason: string };

export function checkoutUrl(fullUrl: string): CheckoutResult {
  try {
    const url = new URL(fullUrl);
    const appHost = typeof window !== "undefined" ? window.location.host : "";

    if (url.pathname === "/_api/iam/cookie/v1/createSessionCookie" && url.host === appHost) {
      const redirectUrl = url.searchParams.get("redirectUrl");
      if (redirectUrl) return { status: "redirect", url: redirectUrl };
    }

    return { status: "redirect", url: url.toString() };
  } catch {
    return { status: "redirect", url: fullUrl };
  }
}

/**
 * Reserve `quantity` tickets for a room's Wix Event and hand off to the
 * Wix-hosted checkout, where the visitor confirms details and pays.
 *
 * Flow (all client-side against visitor tokens):
 *   1. resolve a ticket definition for the event
 *   2. orders.createReservation → reservationId (holds the seats temporarily)
 *   3. redirects.createRedirectSession({ eventsCheckout }) → hosted checkout URL
 *
 * Returns `{ status: "demo" }` when Headless isn't configured so the UI can show
 * a graceful preview instead of failing.
 */
export async function startEventCheckout(room: Room, quantity: number): Promise<CheckoutResult> {
  const client = getBrowserClient();
  if (!client) {
    return { status: "demo", reason: "Connect a Wix Headless client ID to enable live checkout." };
  }
  if (!room.wixEventId) {
    return {
      status: "demo",
      reason: "No published Wix Events are visible to this Headless client yet.",
    };
  }

  try {
    const orderClient = ordersCompat(client.orders);
    const eventSlug = room.wixEventSlug;
    if (!eventSlug) {
      return { status: "error", reason: "This live event is missing its Wix checkout slug." };
    }

    // 1. Resolve a ticket definition (prefer the one carried on the room, else
    //    ask for the event's available tickets).
    let ticketDefinitionId = room.wixTicketDefinitionId;
    if (!ticketDefinitionId) {
      const avail = await orderClient.queryAvailableTickets({
        filter: { eventId: room.wixEventId },
        limit: 1,
      });
      ticketDefinitionId = avail.definitions?.[0]?._id ?? undefined;
    }
    if (!ticketDefinitionId) {
      return { status: "error", reason: "This event has no tickets on sale yet." };
    }

    // 2. Reserve the seats.
    const reservation = await orderClient.createReservation(room.wixEventId, {
      ticketQuantities: [{ ticketDefinitionId, quantity }],
    });
    const reservationId = reservation._id;
    if (!reservationId) {
      return { status: "error", reason: "Could not hold those seats — try again." };
    }

    // 3. Build the Wix-hosted checkout URL and hand off.
    const returnUrl = routeUrl("/thank-you", { event: eventSlug });
    const homeUrl = routeUrl("/");
    const session = await redirectsCompat(client.redirects).createRedirectSession({
      eventsCheckout: { eventSlug, reservationId },
      callbacks: {
        thankYouPageUrl: returnUrl,
        postFlowUrl: homeUrl,
      },
    });

    const url = session.redirectSession?.fullUrl;
    if (!url) return { status: "error", reason: "Checkout session could not be created." };
    return checkoutUrl(url);
  } catch (err) {
    return {
      status: "error",
      reason: err instanceof Error ? err.message : "Something went wrong starting checkout.",
    };
  }
}
