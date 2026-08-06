import styles from "./dashboard.module.css";

export type SortMode = "newest" | "oldest";

interface SortControlProps {
  value: SortMode;
  onChange: (value: SortMode) => void;
}

export function SortControl({ value, onChange }: SortControlProps) {
  return (
    <label className={styles.sortControl}>
      <span className={styles.srOnly}>Sort reports</span>
      <select
        className={styles.sortSelect}
        value={value}
        aria-label="Sort reports"
        title="Sort reports"
        onChange={(event) => onChange(event.target.value as SortMode)}
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
    </label>
  );
}
