import styles from "./dashboard.module.css";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <label className={styles.searchInput}>
      <span className={styles.srOnly}>Search reports</span>
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.searchIcon}>
        <circle cx="10.8" cy="10.8" r="6.2" />
        <path d="m16 16 4.5 4.5" />
      </svg>
      <input
        type="search"
        value={value}
        placeholder="Search reports"
        title="Search reports"
        aria-label="Search reports"
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? (
        <button
          type="button"
          className={styles.searchClear}
          aria-label="Clear report search"
          title="Clear search"
          onClick={() => onChange("")}
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </label>
  );
}
