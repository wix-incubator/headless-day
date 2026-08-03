import { VIEW_CATEGORIES } from "../../lib/viewCategories";
import type { ViewCategoryId } from "../../types/trends";
import styles from "./dashboard.module.css";

interface CategoryFilterProps {
  selected: ViewCategoryId | null;
  onSelect: (id: ViewCategoryId | null) => void;
}

function FocusIcon({ id }: { id: ViewCategoryId }) {
  const props = {
    className: styles.categoryIcon,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  } as const;

  switch (id) {
    case "hype":
      return (
        <svg {...props}>
          <path d="M12 3c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1.4.6-2.4 1.3-3.2C10 9 11 7 12 3z" />
          <path d="M12 21a4 4 0 0 0 4-4c0-2-2-3-4-6-2 3-4 4-4 6a4 4 0 0 0 4 4z" />
        </svg>
      );
    case "new-releases":
      return (
        <svg {...props}>
          <path d="M12 3c3 1 5 4 5 8l-3 3h-4l-3-3c0-4 2-7 5-8z" />
          <circle cx="12" cy="9" r="1.5" />
          <path d="M9 17l-2 4M15 17l2 4" />
        </svg>
      );
    case "mega-markets":
      return (
        <svg {...props}>
          <path d="M6 4h12l3 5-9 11L3 9z" />
          <path d="M3 9h18M9 4L6 9l6 11 6-11-3-5" />
        </svg>
      );
    case "pro-dev":
      return (
        <svg {...props}>
          <path d="M8 6l-5 6 5 6M16 6l5 6-5 6M13 4l-2 16" />
        </svg>
      );
    case "zero-to-one":
      return (
        <svg {...props}>
          <path d="M12 21v-8" />
          <path d="M12 13c-3 0-6-2-6-6 4 0 6 2 6 6z" />
          <path d="M12 13c3 0 6-1 6-5-4 0-6 1-6 5z" />
        </svg>
      );
    case "enterprise":
      return (
        <svg {...props}>
          <path d="M3 9l9-5 9 5H3z" />
          <path d="M5 9v8M10 9v8M14 9v8M19 9v8M3 20h18" />
        </svg>
      );
    case "market-disruption":
      return (
        <svg {...props}>
          <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
        </svg>
      );
  }
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className={styles.categoryChips} role="radiogroup" aria-label="Focus">
      {VIEW_CATEGORIES.map((category) => {
        const isActive = selected === category.id;
        return (
          <button
            key={category.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            title={category.focus}
            className={`${styles.categoryChip} ${
              isActive ? styles.categoryChipActive : ""
            }`}
            onClick={() => onSelect(isActive ? null : category.id)}
          >
            <FocusIcon id={category.id} />
            <span>{category.label}</span>
          </button>
        );
      })}
    </div>
  );
}
