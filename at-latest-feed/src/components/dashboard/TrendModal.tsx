import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { groupToken } from "../../lib/categoryChips";
import type { FeedbackAction, WebTrend } from "../../types/trends";
import { TrendImage } from "./TrendImage";
import styles from "./dashboard.module.css";

interface TrendModalProps {
  trend: WebTrend;
  onClose: () => void;
  isFavorite: boolean;
  favoritePending: boolean;
  onToggleFavorite: (trend: WebTrend) => void;
  memberFeaturesEnabled?: boolean;
}

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const FEEDBACK_OPTIONS: { action: FeedbackAction; label: string }[] = [
  { action: "relevant", label: "👍 Relevant" },
  { action: "more-of-this", label: "🔁 More of this subject" },
  { action: "improve-writing", label: "✍️ Improve writing" },
  { action: "not-detailed-enough", label: "🔍 Not detailed enough" },
];

type FeedbackApiResponse = {
  ok?: boolean;
  error?: string;
  details?: unknown;
  feedback?: FeedbackAction | null;
};

function splitInsight(text: string) {
  return text
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
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

export function TrendModal({
  trend,
  onClose,
  isFavorite,
  favoritePending,
  onToggleFavorite,
  memberFeaturesEnabled = false,
}: TrendModalProps) {
  const insightParagraphs = splitInsight(trend.fullInsight);
  const sharedLayout = useDesktopSharedLayout();
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackAction | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [pendingAction, setPendingAction] = useState<FeedbackAction | null>(null);
  const [pendingMode, setPendingMode] = useState<"save" | "clear" | null>(null);
  const [errorAction, setErrorAction] = useState<FeedbackAction | null>(null);

  useEffect(() => {
    if (!memberFeaturesEnabled) {
      setLoadingFeedback(false);
      setSelectedFeedback(null);
      setPendingAction(null);
      setPendingMode(null);
      setErrorAction(null);
      return;
    }

    let cancelled = false;

    const loadFeedback = async () => {
      setLoadingFeedback(true);
      setSelectedFeedback(null);
      setPendingAction(null);
      setPendingMode(null);
      setErrorAction(null);

      try {
        const response = await fetch(`/api/feedback?trendId=${encodeURIComponent(trend.id)}`);
        let result: FeedbackApiResponse | null = null;
        try {
          result = (await response.json()) as FeedbackApiResponse;
        } catch {
          result = { ok: false, error: "Response was not valid JSON" };
        }

        if (!cancelled) {
          setSelectedFeedback(response.ok && result?.ok ? result.feedback ?? null : null);
        }
      } catch (error) {
        if (!cancelled) setSelectedFeedback(null);
      } finally {
        if (!cancelled) {
          setLoadingFeedback(false);
        }
      }
    };

    void loadFeedback();

    return () => {
      cancelled = true;
    };
  }, [trend.id, memberFeaturesEnabled]);

  const submitFeedback = async (action: FeedbackAction) => {
    if (loadingFeedback || pendingAction) {
      return;
    }

    if (!memberFeaturesEnabled) {
      return;
    }

    const isClearing = selectedFeedback === action;
    const method = isClearing ? "DELETE" : "POST";

    const requestPayload = {
      trendId: trend.id,
      trendTitle: trend.title,
      ...(isClearing ? {} : { action }),
    };

    setPendingAction(action);
    setPendingMode(isClearing ? "clear" : "save");
    setErrorAction(null);

    try {
      const response = await fetch(
        isClearing
          ? `/api/feedback?trendId=${encodeURIComponent(trend.id)}`
          : "/api/feedback",
        isClearing
          ? { method: "DELETE" }
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestPayload),
            },
      );

      let result: FeedbackApiResponse | null = null;
      try {
        result = (await response.json()) as FeedbackApiResponse;
      } catch {
        result = {
          ok: false,
          error: "Response was not valid JSON",
        };
      }

      if (response.ok && result?.ok) {
        setSelectedFeedback(result.feedback ?? null);
        setErrorAction(null);
      } else {
        setErrorAction(action);
      }
    } catch {
      setErrorAction(action);
    } finally {
      setPendingAction(null);
      setPendingMode(null);
    }
  };

  return (
    <>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <div className={styles.modalViewport} onClick={onClose}>
        <motion.article
          // Shared-layout morph fights mobile bottom-sheet sizing — desktop only.
          layoutId={sharedLayout ? `trend-card-${trend.id}` : undefined}
          className={styles.modal}
          initial={sharedLayout ? undefined : { y: "110%" }}
          animate={sharedLayout ? undefined : { y: 0 }}
          exit={sharedLayout ? undefined : { y: "110%" }}
          transition={
            sharedLayout
              ? { type: "spring", stiffness: 300, damping: 30 }
              : { type: "spring", stiffness: 380, damping: 36 }
          }
          onClick={(event) => event.stopPropagation()}
        >
        <div className={styles.modalActions}>
          {memberFeaturesEnabled ? (
            <button
              type="button"
              className={`${styles.favoriteButton} ${styles.modalFavoriteButton} ${isFavorite ? styles.favoriteButtonActive : ""}`}
              title={isFavorite ? "Remove favorite" : "Add favorite"}
              aria-label={isFavorite ? `Remove ${trend.title} from favorites` : `Add ${trend.title} to favorites`}
              aria-pressed={isFavorite}
              disabled={favoritePending}
              onClick={() => onToggleFavorite(trend)}
            >
              <StarIcon filled={isFavorite} />
            </button>
          ) : (
            <span aria-hidden="true" />
          )}

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            title="Close"
            aria-label="Close report"
          >
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          <header className={styles.modalHeader}>
            <div className={styles.modalMeta}>
              <span
                className={styles.categoryBadge}
                data-group={groupToken(trend.group)}
              >
                {trend.tag ?? trend.category.join(" · ")}
              </span>
              {trend.focus ? <span className={styles.groupBadge}>{trend.focus}</span> : null}
              {trend.signalLabel ? <span className={styles.groupBadge}>{trend.signalLabel}</span> : null}
              <span className={styles.groupBadge}>{trend.group}</span>
              <span className={styles.modalDate}>
                {dateFormatter.format(new Date(trend.publishDate))}
              </span>
            </div>

            <h2 className={styles.modalTitle}>{trend.title}</h2>
            <p className={styles.modalSnippet}>{trend.snippet}</p>
          </header>

          <TrendImage
            url={trend.image?.url}
            credit={trend.image?.credit}
            alt={trend.title}
            variant="hero"
            seed={trend.id}
          />

          <section
            className={trend.metric ? styles.modalGrid : undefined}
          >
            <div className={styles.editorialPanel}>
              <div className={styles.panelLabel}>Insight</div>
              <div className={styles.insightCopy}>
                {insightParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>

            {trend.metric ? (
              <div className={styles.analyticsPanel}>
                <div className={styles.panelLabel}>Key stat</div>
                <div className={styles.analyticsHeader}>
                  <div>
                    <div className={styles.statValueDisplay}>
                      {trend.metric.display}
                    </div>
                    <div className={styles.analyticsCaption}>
                      {trend.metric.caption}
                    </div>
                  </div>
                  <div className={styles.analyticsChip}>
                    {trend.metric.trend}
                  </div>
                </div>

                <a
                  href={trend.metric.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.sourceLink}
                >
                  {trend.metric.source.label} ↗
                </a>
              </div>
            ) : null}
          </section>

          <section className={styles.impactPanel}>
            <div className={styles.panelLabel}>Impact on Wix</div>
            <p className={styles.impactCopy}>{trend.wixImpact}</p>
          </section>

          {trend.companies?.length ? (
            <section className={styles.sourcesPanel}>
              <div className={styles.panelLabel}>Companies to watch</div>
              <div className={styles.sourceLinks}>
                {trend.companies.map((company) => (
                  <span key={company} className={styles.sourceLink}>
                    {company}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <section className={styles.recommendationsPanel}>
            <div className={styles.panelLabel}>Recommendations</div>
            <ul className={styles.recommendationList}>
              {trend.recommendations.map((recommendation) => (
                <li key={recommendation}>{recommendation}</li>
              ))}
            </ul>
          </section>

          {trend.sources.length > 0 ? (
            <section className={styles.sourcesPanel}>
              <div className={styles.panelLabel}>Read more</div>
              <div className={styles.sourceLinks}>
                {trend.sources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.sourceLink}
                    title="Open article or post"
                  >
                    {source.label} ↗
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          {memberFeaturesEnabled ? (
          <section className={styles.feedbackPanel}>
            <div className={styles.panelLabel}>› rate this signal</div>
            <p className={styles.feedbackHint}>
              Your feedback is saved to the site CMS and trains how future
              reports are written and prioritized.
            </p>
            <div className={styles.feedbackChips}>
                {FEEDBACK_OPTIONS.map((option) => {
                  const isActive = selectedFeedback === option.action;
                  const isPending = pendingAction === option.action;
                  const isError = errorAction === option.action;
                  const buttonLabel = isPending
                    ? pendingMode === "clear"
                      ? "Removing…"
                      : "Saving…"
                    : option.label;
                  return (
                    <button
                      key={option.action}
                      type="button"
                      className={`${styles.feedbackChip} ${
                        isActive ? styles.feedbackChipSaved : ""
                      } ${isError ? styles.feedbackChipError : ""}`}
                      onClick={() => submitFeedback(option.action)}
                      title={isActive ? "Clear feedback" : "Save feedback"}
                      aria-pressed={isActive}
                      disabled={loadingFeedback || Boolean(pendingAction)}
                    >
                      {buttonLabel}
                    </button>
                  );
                })}
            </div>
          </section>
          ) : null}
        </div>
        </motion.article>
      </div>
    </>
  );
}
