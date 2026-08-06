import type { FilterState } from "../../types/trends";
import styles from "./dashboard.module.css";

interface FilterPillProps {
  label: string;
  state: FilterState;
  onCycle: () => void;
  tone?: string;
  description?: string;
}

const STATE_LABEL: Record<FilterState, string> = {
  on: "included",
  neutral: "neutral",
  off: "excluded",
};

function StateGlyph({ state }: { state: FilterState }) {
  if (state === "on") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true" className={styles.pillGlyph}>
        <path
          d="M5 10.5l3 3 7-7"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
      </svg>
    );
  }

  if (state === "off") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true" className={styles.pillGlyph}>
        <path
          d="M6 6l8 8M14 6l-8 8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={styles.pillGlyph}>
      <path
        d="M6 10h8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

export function FilterPill({
  label,
  state,
  onCycle,
  tone,
  description,
}: FilterPillProps) {
  return (
    <button
      type="button"
      className={`${styles.triPill} ${
        state === "on" ? styles.triPillOn : state === "off" ? styles.triPillOff : ""
      }`}
      aria-label={`${label}: ${STATE_LABEL[state]}. Click to change.`}
      data-state={state}
      data-group={tone}
      title={`${label} - ${STATE_LABEL[state]}${description ? `. ${description}` : ""}`}
      onClick={onCycle}
    >
      <StateGlyph state={state} />
      <span className={styles.triPillLabel}>{label}</span>
    </button>
  );
}
