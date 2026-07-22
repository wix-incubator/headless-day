import type { APIRoute } from "astro";
import { currentCart } from "@wix/ecom";
import { redirects } from "@wix/redirects";

// Turn the visitor's current cart into a Wix-hosted checkout and send them
// there. This is a plain navigation target (the "Go to checkout" link points
// straight at it), so it responds with a 302 redirect rather than JSON.
//
// Flow: createCheckoutFromCurrentCart -> checkoutId -> createRedirectSession
// (with a postFlowUrl back to our site) -> redirect to redirectSession.fullUrl.
// If the cart is empty (or anything else fails), fall back to the shop page
// instead of showing a raw error.
//
// NB: build the 302 with `new Response(...)`, NOT `Response.redirect()`.
// The static helper returns a response with an *immutable* headers guard;
// when the Wix/Cloudflare runtime later touches the headers it throws
// "Error while running user code - immutable". A hand-built Response has
// mutable headers and passes through cleanly.
const redirectTo = (url: string) =>
  new Response(null, { status: 302, headers: { Location: url } });

// Resolve the public origin for our callback URLs.
//
// Behind the Wix proxy the inbound request often arrives over http, so
// `new URL(request.url).origin` yields "http://<domain>". The Headless
// allowed-redirect-domains allowlist is keyed on the *https* domain, so an
// http callback is rejected with "isn't listed as an allowed redirect
// domain". We therefore trust the forwarded host and force https for the
// real domain, keeping http only for local development.
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

function resolveOrigin(request: Request): string {
  const reqUrl = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
    reqUrl.host;
  const isLocal = LOCAL_HOSTS.some((h) => host.startsWith(h));
  return `${isLocal ? "http" : "https"}://${host}`;
}

export const GET: APIRoute = async ({ request }) => {
  const origin = resolveOrigin(request);
  const backToShop = () => redirectTo(`${origin}/shop?checkout=unavailable`);

  try {
    const checkout: any = await currentCart.createCheckoutFromCurrentCart({
      channelType: currentCart.ChannelType.WEB,
    });
    const checkoutId = checkout?.checkoutId ?? checkout?.checkout?._id;
    if (!checkoutId) return backToShop();

    const session: any = await redirects.createRedirectSession({
      ecomCheckout: { checkoutId },
      callbacks: {
        // payment completed -> success page (Wix appends ?orderId=...)
        thankYouPageUrl: `${origin}/success`,
        // flow abandoned or interrupted (not paid) -> failure page
        postFlowUrl: `${origin}/failure`,
      },
    });
    const url =
      session?.redirectSession?.fullUrl ?? session?.redirectSession?.fullURL;
    if (!url) return backToShop();

    return redirectTo(url);
  } catch {
    return backToShop();
  }
};
