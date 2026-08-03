import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { groupToken, shortCategory } from "../../lib/categoryChips";
import type { TrendGroup, TrendMetric, ViewMode, WebTrend } from "../../types/trends";
import { TrendImage } from "./TrendImage";
import styles from "./dashboard.module.css";

function useDesktopSharedLayout() {
  const [enabled, setEnabled] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return enabled;
}

interface TrendCardProps {
  trend: WebTrend;
  viewMode?: ViewMode;
  isMuted: boolean;
  onSelect: (trend: WebTrend) => void;
  anchorId?: string;
  isFavorite: boolean;
  favoritePending?: boolean;
  onToggleFavorite: (trend: WebTrend) => void;
  onGroupSelect?: (group: TrendGroup) => void;
  memberFeaturesEnabled?: boolean;
}

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const relativeDateFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

function formatTrendDate(iso: string) {
  const timestamp = Date.parse(iso);
  const days = Math.round((timestamp - Date.now()) / 86400000);
  return Math.abs(days) < 30
    ? relativeDateFormatter.format(days, "day")
    : dateFormatter.format(new Date(iso));
}

function isNumericMetric(display: string) {
  // Keep real numbers ($200M, 24%, +12) — drop editorial phrases ("2 paths", "Build once").
  return /^[+\-]?\$?\d[\d.,]*\s?[%KkMmBb]?$/.test(display.trim());
}

function getTrendSignal(metric: TrendMetric) {
  const showArrow = isNumericMetric(metric.display);
  const arrow = showArrow
    ? metric.trend === "up"
      ? "↑ "
      : metric.trend === "down"
        ? "↓ "
        : ""
    : "";
  return `${arrow}${metric.display}`;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.favoriteIcon}>
      <path
        d="M12 3.75l2.56 5.19 5.72.83-4.14 4.04.98 5.7L12 16.82 6.88 19.5l.98-5.7-4.14-4.04 5.72-.83L12 3.75z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrendCard({
  trend,
  viewMode = "grid",
  isMuted,
  onSelect,
  anchorId,
  isFavorite,
  favoritePending = false,
  onToggleFavorite,
  onGroupSelect,
  memberFeaturesEnabled = false,
}: TrendCardProps) {
  const isCompact = viewMode === "list";
  const isFeed = viewMode === "feed";
  const sharedLayout = useDesktopSharedLayout();

  return (
    <motion.article
      // Shared-layout: desktop grid/feed only. List rows + mobile skip it —
      // on phones it fights the bottom-sheet modal sizing.
      layoutId={!isCompact && sharedLayout ? `trend-card-${trend.id}` : undefined}
      layout={isCompact || !sharedLayout ? false : undefined}
      id={anchorId}
      className={`${styles.card} ${isMuted ? styles.cardMuted : ""} ${
        isCompact ? styles.cardCompact : ""
      } ${isFeed ? styles.cardFeed : ""}`}
      onClick={() => onSelect(trend)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(trend);
        }
      }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      role="button"
      tabIndex={0}
      title="Read more"
      aria-label={`Open trend report for ${trend.title}`}
    >
      {memberFeaturesEnabled ? (
        <button
          type="button"
          className={`${styles.favoriteButton} ${isFavorite ? styles.favoriteButtonActive : ""}`}
          title={isFavorite ? "Remove favorite" : "Add favorite"}
          aria-label={isFavorite ? `Remove ${trend.title} from favorites` : `Add ${trend.title} to favorites`}
          aria-pressed={isFavorite}
          disabled={favoritePending}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(trend);
          }}
        >
          <StarIcon filled={isFavorite} />
        </button>
      ) : null}

      {isCompact ? null : (
        <TrendImage
          url={trend.image?.url}
          alt={trend.title}
          variant="card"
          seed={trend.id}
        />
      )}

      <div
        className={
          isFeed ? styles.cardFeedContent : styles.cardContentPassthrough
        }
      >
        <div className={styles.cardTopRow}>
          <span
            className={styles.categoryBadge}
            data-group={groupToken(trend.group)}
            title={trend.category[0]}
          >
            {shortCategory(trend.category[0])}
          </span>
          <span
            className={styles.publishDate}
            title={dateFormatter.format(new Date(trend.publishDate))}
          >
            {formatTrendDate(trend.publishDate)}
          </span>
        </div>

        <div className={styles.cardBody}>
          <h3 className={styles.cardTitle}>{trend.title}</h3>
          <p className={styles.cardSnippet}>{trend.snippet}</p>
        </div>

        <div className={styles.cardFooter}>
          {trend.metric && (!isCompact || isNumericMetric(trend.metric.display)) ? (
            <span className={styles.metricValue} title={trend.metric.caption}>
              {getTrendSignal(trend.metric)}
              {!isCompact && trend.metric.caption ? (
                <span className={styles.metricCaption}> {trend.metric.caption}</span>
              ) : null}
            </span>
          ) : (
            <span aria-hidden="true" />
          )}
          <button
            type="button"
            className={styles.metricLabel}
            title={`Filter by ${trend.group}`}
            aria-label={`Filter by ${trend.group}`}
            onClick={(event) => {
              event.stopPropagation();
              onGroupSelect?.(trend.group);
            }}
          >
            {trend.group}
          </button>
        </div>
      </div>
    </motion.article>
  );
}
