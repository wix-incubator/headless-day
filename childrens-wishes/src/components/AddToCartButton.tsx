import { useState } from "react";
import { getWixClient } from "../lib/wix-browser-client";

const WIX_STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";

interface Props {
  productId: string;
  disabled?: boolean;
}

export default function AddToCartButton({ productId, disabled }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function handleClick() {
    if (state === "loading") return;
    setState("loading");
    try {
      const client = getWixClient();

      // Add to cart
      await client.currentCart.addToCurrentCart({
        lineItems: [{
          catalogReference: {
            appId: WIX_STORES_APP_ID,
            catalogItemId: productId,
          },
          quantity: 1,
        }],
      });

      // Go to cart page
      window.location.href = "/cart";
    } catch (err) {
      console.error("Checkout failed:", err);
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  const labels = {
    idle:    "Grant this wish ✦",
    loading: "Adding to cart…",
    error:   "Something went wrong — try again",
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || state === "loading"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        padding: "16px",
        borderRadius: "16px",
        background: state === "error" ? "#C0392B" : "#0F0E17",
        color: "#FFFBF5",
        fontFamily: "inherit",
        fontSize: "16px",
        fontWeight: 700,
        border: "none",
        cursor: state === "loading" ? "not-allowed" : "pointer",
        opacity: state === "loading" ? 0.7 : 1,
        transition: "background 0.2s, opacity 0.2s",
        marginBottom: "28px",
        letterSpacing: "0.01em",
      }}
      aria-live="polite"
    >
      {labels[state]}
    </button>
  );
}
