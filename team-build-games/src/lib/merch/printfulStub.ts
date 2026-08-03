/**
 * Print-on-demand submission — STUB. The site runs in sandbox mode, so instead
 * of calling Printful we mint a realistic-looking fulfillment record that is
 * stored on the order. Nothing is printed, nothing ships, nobody is charged.
 *
 * Swapping in the real thing later: replace `submitToPrintful` with a POST to
 * `https://api.printful.com/orders` (API key from env) mapping our product
 * slugs/options to Printful variant ids and attaching a print-file URL rendered
 * from the payload; keep the same return shape so orders code doesn't change.
 */

export interface PodSubmission {
  provider: string;
  podOrderId: string;
  podStatus: string;
}

export function submitToPrintful(orderNumber: string): PodSubmission {
  return {
    provider: "printful (stubbed — sandbox)",
    podOrderId: `PF-TEST-${orderNumber}`,
    podStatus: "queued for print — simulated, nothing will ship",
  };
}
