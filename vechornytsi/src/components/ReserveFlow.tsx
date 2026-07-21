import { useState } from "react";
import { currentCart } from "@wix/ecom";
import { redirects } from "@wix/redirects";

const WIX_STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";

interface Props {
  dinnerTitle: string;
  fullProductId: string;
  fullPriceLabel: string;
  depositProductId?: string;
  depositPriceLabel?: string;
  balanceLabel?: string;
}

const methods = [
  { key: "card", label: "Card" },
  { key: "applepay", label: "Apple Pay" },
  { key: "googlepay", label: "Google Pay" },
  { key: "paypal", label: "PayPal" },
];

export default function ReserveFlow({
  dinnerTitle, fullProductId, fullPriceLabel,
  depositProductId, depositPriceLabel, balanceLabel,
}: Props) {
  const hasDeposit = Boolean(depositProductId);
  const [choice, setChoice] = useState<"deposit" | "full">(hasDeposit ? "deposit" : "full");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");

  const proceed = async () => {
    const productId = choice === "deposit" && depositProductId ? depositProductId : fullProductId;
    setStatus("working");
    try {
      await currentCart.addToCurrentCart({
        lineItems: [{
          catalogReference: { appId: WIX_STORES_APP_ID, catalogItemId: productId },
          quantity: 1,
        }],
      });
      const { checkoutId } = await currentCart.createCheckoutFromCurrentCart({
        channelType: currentCart.ChannelType.WEB,
      });
      const { redirectSession } = await redirects.createRedirectSession({
        ecomCheckout: { checkoutId },
        callbacks: {
          postFlowUrl: window.location.origin,
          thankYouPageUrl: `${window.location.origin}/thank-you`,
          cartPageUrl: `${window.location.origin}/cart`,
        },
      });
      if (redirectSession?.fullUrl) {
        window.location.href = redirectSession.fullUrl;
      } else {
        window.location.href = "/cart";
      }
    } catch (err) {
      console.error("[reserve] checkout failed:", err);
      setStatus("error");
    }
  };

  const Row = ({
    value, title, price, note,
  }: { value: "deposit" | "full"; title: string; price: string; note: string }) => {
    const active = choice === value;
    return (
      <button
        type="button"
        onClick={() => setChoice(value)}
        aria-pressed={active}
        className="w-full text-left rounded-sm border p-5 transition-colors flex items-start gap-4"
        style={{
          borderColor: active ? "var(--color-accent)" : "var(--color-rule)",
          background: active ? "color-mix(in srgb, var(--color-accent) 10%, var(--color-paper-warm))" : "var(--color-paper-warm)",
        }}
      >
        <span
          aria-hidden="true"
          className="mt-1 inline-block w-4 h-4 rounded-full border shrink-0"
          style={{
            borderColor: active ? "var(--color-accent)" : "var(--color-rule)",
            background: active ? "var(--color-accent)" : "transparent",
            boxShadow: active ? "inset 0 0 0 3px var(--color-paper-warm)" : "none",
          }}
        />
        <span className="flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="font-display text-xl text-ink">{title}</span>
            <span className="font-display text-2xl text-ink-soft">{price}</span>
          </span>
          <span className="block text-sm text-mute mt-1">{note}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="kicker">Choose how to pay</p>
      <div className="flex flex-col gap-3">
        {hasDeposit && (
          <Row
            value="deposit"
            title="20% deposit"
            price={depositPriceLabel ?? ""}
            note={`Hold your seat now. ${balanceLabel ?? "The balance"} is settled at the table on the night.`}
          />
        )}
        <Row
          value="full"
          title="Pay in full"
          price={fullPriceLabel}
          note="Nothing left to pay on the night."
        />
      </div>

      <button className="btn-primary w-full mt-2" onClick={proceed} disabled={status === "working"}>
        {status === "working" ? "Taking you to checkout…" : "Continue to secure checkout"}
      </button>

      <div className="flex flex-wrap items-center gap-2 justify-center mt-1">
        {methods.map((m) => (
          <span
            key={m.key}
            className="text-xs px-2.5 py-1 rounded-sm border"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-mute)" }}
          >
            {m.label}
          </span>
        ))}
      </div>
      <p className="text-xs text-mute text-center">Secure checkout handled by Wix. Card, Apple Pay, Google Pay and PayPal are offered once the kitchen connects its payment account.</p>

      {status === "error" && (
        <div className="form-status" data-state="error">
          Could not open checkout just now. Please try again, or <a href="/cart" className="underline">review your cart</a>.
        </div>
      )}
    </div>
  );
}
