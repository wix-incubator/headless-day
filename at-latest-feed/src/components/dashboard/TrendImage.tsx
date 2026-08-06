import { useMemo, useState } from "react";
import { getTrendCoverImageSources } from "../../lib/wixImage";
import type { TrendSource } from "../../types/trends";
import styles from "./dashboard.module.css";

interface TrendImageProps {
  url?: string;
  credit?: TrendSource;
  alt: string;
  variant: "card" | "hero";
  /** Seed (e.g. trend id) so the fallback gradient is stable but varied. */
  seed: string;
}

const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, #007aff 0%, #00d1b2 100%)",
  "linear-gradient(135deg, #6366f1 0%, #00aaff 100%)",
  "linear-gradient(135deg, #ff7a59 0%, #ffb347 100%)",
  "linear-gradient(135deg, #0ea5e9 0%, #22d3ee 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
];

function gradientFor(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 997;
  }
  return FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length];
}

export function TrendImage({ url, credit, alt, variant, seed }: TrendImageProps) {
  const [failed, setFailed] = useState(false);
  const containerClass = variant === "card" ? styles.cardCover : styles.modalHero;
  const optimized = useMemo(
    () => (url ? getTrendCoverImageSources(url, variant, seed) : null),
    [url, variant, seed],
  );
  const showImage = Boolean(url) && !failed;

  return (
    <div className={containerClass}>
      {showImage ? (
        <img
          src={optimized?.src ?? url}
          srcSet={optimized?.srcSet}
          sizes={optimized?.sizes}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={styles.coverImage}
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className={styles.coverFallback}
          style={{ backgroundImage: gradientFor(seed) }}
          aria-hidden="true"
        />
      )}

      {variant === "hero" && showImage && credit ? (
        <span className={styles.imageCredit}>
          Image:{" "}
          <a href={credit.url} target="_blank" rel="noopener noreferrer">
            {credit.label}
          </a>
        </span>
      ) : null}
    </div>
  );
}
