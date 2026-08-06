/**
 * Inline React SVG merch previews for the game-ended overlay.
 * Composites the player's warrior sprite and avatar photo onto each product shape.
 * The server-rendered MerchPreview.astro (shop page) is separate — no session data there.
 */

import { useId } from "react";

type Product = "tee" | "mug" | "keychain" | "poster";

interface MerchPreviewInlineProps {
  product: Product;
  title: string;
  sub: string;
  garmentColor?: string;
  printColor?: string;
  warriorSrc: string;
  avatarUrl?: string | null;
}

const DEFAULT_GARMENT: Record<Product, string> = {
  tee:      "#15151f",
  mug:      "#15151f",
  keychain: "#1d2a4d",
  poster:   "#0b0b1a",
};

// Warrior sprite placement within the 200×200 viewBox for each product
const WARRIOR: Record<Product, { x: number; y: number; w: number; h: number }> = {
  tee:      { x: 72,  y: 103, w: 56, h: 58  },
  mug:      { x: 50,  y: 72,  w: 60, h: 70  },
  keychain: { x: 68,  y: 58,  w: 64, h: 82  },
  poster:   { x: 55,  y: 56,  w: 90, h: 110 },
};

// Avatar circle clip — center and radius in the same viewBox coordinate space
const AVATAR: Record<Product, { cx: number; cy: number; r: number }> = {
  tee:      { cx: 100, cy: 113, r: 9  },
  mug:      { cx: 80,  cy: 84,  r: 8  },
  keychain: { cx: 100, cy: 73,  r: 9  },
  poster:   { cx: 100, cy: 70,  r: 11 },
};

const textStyle = { fontFamily: "var(--font-display)" } as const;

export default function MerchPreviewInline({
  product,
  title,
  sub,
  garmentColor,
  printColor = "#22d3ee",
  warriorSrc,
  avatarUrl,
}: MerchPreviewInlineProps) {
  const gColor = garmentColor ?? DEFAULT_GARMENT[product];
  const wr = WARRIOR[product];
  const av = AVATAR[product];
  // useId keeps the clip unique when several previews (e.g. the grid + hero tee) share the page.
  const clipId = `merch-av-${product}-${useId()}`;

  const defs = avatarUrl ? (
    <defs>
      <clipPath id={clipId}>
        <circle cx={av.cx} cy={av.cy} r={av.r} />
      </clipPath>
    </defs>
  ) : null;

  const warrior = (
    <image
      href={warriorSrc}
      x={wr.x}
      y={wr.y}
      width={wr.w}
      height={wr.h}
      preserveAspectRatio="xMidYMin meet"
    />
  );

  // avatarUrl is server-resolved from the local member's own Wix media profile — first-party, never a peer-supplied URL.
  const avatar = avatarUrl ? (
    <image
      href={avatarUrl}
      x={av.cx - av.r}
      y={av.cy - av.r}
      width={av.r * 2}
      height={av.r * 2}
      clipPath={`url(#${clipId})`}
      preserveAspectRatio="xMidYMid slice"
    />
  ) : null;

  if (product === "tee") {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="T-shirt preview">
        {defs}
        <path
          fill={gColor}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="2"
          d="M50 52 H80 V62 H120 V52 H150 L172 88 L146 103 L140 91 V172 H60 V91 L54 103 L28 88 Z"
        />
        <text x="100" y="100" fill={printColor} fontSize="8" textAnchor="middle" textLength="72" lengthAdjust="spacingAndGlyphs" style={textStyle}>
          {title}
        </text>
        {warrior}
        {avatar}
        <text x="100" y="166" fill={printColor} fontSize="5" opacity="0.8" textAnchor="middle" textLength="68" lengthAdjust="spacingAndGlyphs" style={textStyle}>
          {sub}
        </text>
      </svg>
    );
  }

  if (product === "mug") {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Mug preview">
        {defs}
        <rect x="120" y="78" width="34" height="54" rx="10" fill="none" stroke={gColor} strokeWidth="10" />
        <rect fill={gColor} stroke="rgba(255,255,255,0.25)" strokeWidth="2" x="46" y="58" width="86" height="96" rx="6" />
        <rect x="46" y="58" width="86" height="10" fill="rgba(255,255,255,0.15)" />
        {warrior}
        {avatar}
        <text x="89" y="148" fill={printColor} fontSize="7" textAnchor="middle" textLength="64" lengthAdjust="spacingAndGlyphs" style={textStyle}>
          {title}
        </text>
        <text x="89" y="158" fill={printColor} fontSize="4.5" opacity="0.8" textAnchor="middle" textLength="60" lengthAdjust="spacingAndGlyphs" style={textStyle}>
          {sub}
        </text>
      </svg>
    );
  }

  if (product === "keychain") {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Keychain preview">
        {defs}
        {/* ring loop at top */}
        <circle cx="100" cy="44" r="10" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="4" />
        {/* tag body */}
        <rect fill={gColor} stroke="rgba(255,255,255,0.25)" strokeWidth="2" x="65" y="54" width="70" height="110" rx="10" />
        {warrior}
        {avatar}
        <text x="100" y="149" fill={printColor} fontSize="5" opacity="0.8" textAnchor="middle" textLength="58" lengthAdjust="spacingAndGlyphs" style={textStyle}>
          {sub}
        </text>
      </svg>
    );
  }

  // poster
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Poster preview">
      {defs}
      <rect x="40" y="20" width="120" height="160" fill="#0b0b1a" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
      <rect x="48" y="28" width="104" height="144" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {/* arena grid — subtle vertical lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`v${i}`} x1={56 + i * 22} y1={29} x2={56 + i * 22} y2={171} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      ))}
      {/* arena grid — subtle horizontal lines */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={`h${i}`} x1={49} y1={36 + i * 24} x2={151} y2={36 + i * 24} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      ))}
      <text x="100" y="42" fill={printColor} fontSize="8" textAnchor="middle" textLength="88" lengthAdjust="spacingAndGlyphs" style={textStyle}>
        {title}
      </text>
      {warrior}
      {avatar}
      <text x="100" y="172" fill={printColor} fontSize="5" opacity="0.8" textAnchor="middle" textLength="80" lengthAdjust="spacingAndGlyphs" style={textStyle}>
        {sub}
      </text>
    </svg>
  );
}
