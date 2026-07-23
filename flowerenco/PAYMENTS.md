# Payments

**Decision (current):** accept **credit cards** via Wix hosted checkout. **No auth/capture** — standard
immediate capture. Auth-capture is dropped.

## Policies shown on the site
- **Shipping** is **paid on collection** of the item — nothing is charged for shipping at checkout.
  (So don't add shipping rules that charge at checkout; keep checkout to the product price.)
- **Refund on rejection = 70%.** If the buyer rejects the finished piece, refund 70% and keep 30%
  (materials + studio time). Issue the 70% refund from the Wix **Orders** dashboard, or via the eCom
  **Refunds** API. Disclaimers are on the **basket** ("Good to know" box) and each **product page**.

## Connecting card payments (owner, dashboard — cannot be done headlessly)
Requires merchant onboarding (business + bank + ID), so it's a Wix dashboard step:
1. manage.wix.com → site `421edfe8-aed6-484e-b980-bc434ab0b75a` → **Settings → Accept Payments**
   (direct: https://manage.wix.com/dashboard/421edfe8-aed6-484e-b980-bc434ab0b75a/payments).
2. Connect **Wix Payments** (cards) — optionally add PayPal etc.
3. Complete onboarding → the basket "Pay by card" button then accepts cards at the hosted checkout.

Once connected, a live test order confirms cards work (headless code needs no change).
