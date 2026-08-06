import type { ViewMode } from "../../types/trends";
import styles from "./dashboard.module.css";

interface ViewSwitcherProps {
  activeView: ViewMode;
  onChange: (view: ViewMode) => void;
}

const VIEW_OPTIONS: { mode: ViewMode; label: string }[] = [
  { mode: "feed", label: "Feed view" },
  { mode: "list", label: "Compact list view" },
  { mode: "grid", label: "Grid view" },
];

function ViewIcon({ mode }: { mode: ViewMode }) {
  if (mode === "feed") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.viewIcon}>
        <rect x="3" y="4" width="18" height="6" rx="2" />
        <rect x="3" y="14" width="18" height="6" rx="2" />
      </svg>
    );
  }

  if (mode === "list") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.viewIcon}>
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="10" x2="20" y2="10" />
        <line x1="4" y1="14" x2="20" y2="14" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.viewIcon}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function ViewSwitcher({ activeView, onChange }: ViewSwitcherProps) {
  return (
    <div className={styles.viewSwitcher} role="group" aria-label="Choose layout">
      {VIEW_OPTIONS.map((option) => (
        <button
          key={option.mode}
          type="button"
          className={`${styles.viewButton} ${
            activeView === option.mode ? styles.viewButtonActive : ""
          }`}
          aria-pressed={activeView === option.mode}
          aria-label={option.label}
          title={option.label}
          onClick={() => onChange(option.mode)}
        >
          <ViewIcon mode={option.mode} />
        </button>
      ))}
    </div>
  );
}
