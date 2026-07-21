/**
 * Quick connectivity probe: does the Client ID authenticate, and are there
 * published events? Run: node --env-file=.env.local scripts/check-wix.mjs
 */
import { createClient, OAuthStrategy } from "@wix/sdk";
import { wixEventsV2 } from "@wix/events";

const clientId = (process.env.NEXT_PUBLIC_WIX_CLIENT_ID || "").trim();
if (!clientId) {
  console.error("✗ NEXT_PUBLIC_WIX_CLIENT_ID is not set in .env.local");
  process.exit(1);
}

const client = createClient({
  modules: { wixEventsV2 },
  auth: OAuthStrategy({ clientId }),
});

try {
  const res = await client.wixEventsV2.queryEvents().limit(50).find();
  const items = res.items ?? [];
  console.log(`✓ Connected. ${items.length} event(s) visible to the Headless client.`);
  for (const e of items) {
    console.log(`   • ${e.title}  (slug=${e.slug}, status=${e.status ?? "?"})`);
  }
  if (items.length === 0) {
    console.log("\n  → No published events yet. Add + publish at least one in Wix Events");
    console.log("    (with a paid ticket) to see the grid go 'Live from Wix'.");
  }
} catch (err) {
  console.error("✗ Query failed:", err?.message ?? err);
  console.error("  Check that the Client ID is correct and Wix Events is installed.");
  process.exit(1);
}
