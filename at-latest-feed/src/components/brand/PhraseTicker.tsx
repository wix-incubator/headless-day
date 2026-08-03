import { useEffect, useRef, useState } from "react";

const BASE_TERMS = [
  "Agentic Checkout",
  "Agentic Commerce",
  "Headless Commerce",
  "Composable Architecture",
  "Dropshipping",
  "Print-on-Demand",
  "Small Medium Business",
  "Recurring Payments",
  "Subscription Billing",
  "Buy Now Pay Later",
  "Digital Wallets",
  "Tokenized Payments",
  "GEO and SEO",
  "LLM Optimization",
  "Social Media Feed",
  "Product Search",
  "Visual Search",
  "Customer Management",
  "Marketing Automation",
  "Loyalty Programs",
  "Retail Media Networks",
  "Omnichannel Retail",
  "Inventory Sync",
  "Order Fulfillment",
  "Supply Chain Visibility",
  "First-Party Data",
  "Server-Side Tracking",
  "Consent Management",
  "Data Residency",
  "Identity and Access",
  "Edge Computing",
  "Core Web Vitals",
  "Progressive Web Apps",
  "Server-Side Rendering",
  "Static Site Generation",
  "API-First Development",
  "Multi-Agent Systems",
  "Conversational Commerce",
  "Voice Commerce",
  "Personalization Engines",
  "Real-Time Analytics",
  "Data Warehousing",
  "Tax Compliance",
  "Fraud Prevention",
  "Checkout Optimization",
  "Cart Abandonment",
  "Marketplace Syndication",
  "Feed Management",
  "Developer Extensibility",
  "CLI Tooling",
];

/** Insert "@latest" as every 5th item in the loop. */
const TICKER_TERMS = BASE_TERMS.flatMap((term, i) =>
  (i + 1) % 4 === 0 ? [term, "@latest"] : [term],
);

const TYPE_SPEED = 45;
const DELETE_SPEED = 25;
const HOLD_TIME = 1100;
const GAP_TIME = 250;

export function PhraseTicker() {
  const [text, setText] = useState("");
  const pausedRef = useRef(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setText(TICKER_TERMS[0]);
      return;
    }

    let termIndex = 0;
    let charIndex = 0;
    let typing = true;
    let timeoutId = 0;
    let cancelled = false;

    const schedule = (fn: () => void, ms: number) => {
      timeoutId = window.setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    };

    const tick = () => {
      if (pausedRef.current) {
        schedule(tick, 200);
        return;
      }

      const current = TICKER_TERMS[termIndex];

      if (typing) {
        charIndex += 1;
        setText(current.slice(0, charIndex));
        if (charIndex === current.length) {
          typing = false;
          schedule(tick, HOLD_TIME);
          return;
        }
      } else {
        charIndex -= 1;
        setText(current.slice(0, charIndex));
        if (charIndex === 0) {
          typing = true;
          termIndex = (termIndex + 1) % TICKER_TERMS.length;
          schedule(tick, GAP_TIME);
          return;
        }
      }

      schedule(tick, typing ? TYPE_SPEED : DELETE_SPEED);
    };

    tick();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <span
      className="phrase-ticker"
      aria-live="polite"
      aria-atomic="true"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      {text}
      <span className="phrase-ticker__caret" aria-hidden="true" />
    </span>
  );
}
