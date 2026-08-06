import { useState } from "react";
import { groupToken, TREND_GROUP_DESCRIPTIONS } from "../../lib/categoryChips";
import { getState } from "../../lib/filterState";
import type { FilterStateMap, TrendGroup, ViewCategoryId } from "../../types/trends";
import { CategoryFilter } from "./CategoryFilter";
import { FilterPill } from "./FilterPill";
import styles from "./dashboard.module.css";

type ViewFilter = "All" | "Favorites";

interface FilterPanelProps {
  memberFeaturesEnabled: boolean;
  activeView: ViewFilter;
  onViewChange: (view: ViewFilter) => void;
  favoritesCount: number;
  groups: TrendGroup[];
  groupStates: FilterStateMap;
  onGroupCycle: (group: TrendGroup) => void;
  selectedFocus: ViewCategoryId | null;
  onFocusSelect: (id: ViewCategoryId | null) => void;
  filtersActive: boolean;
  onClearFilters: () => void;
}

export function FilterPanel({
  memberFeaturesEnabled,
  activeView,
  onViewChange,
  favoritesCount,
  groups,
  groupStates,
  onGroupCycle,
  selectedFocus,
  onFocusSelect,
  filtersActive,
  onClearFilters,
}: FilterPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeOnCount = groups.filter((group) => getState(groupStates, group) === "on").length;
  const activeOffCount = groups.filter((group) => getState(groupStates, group) === "off").length;
  const activeTotal = activeOnCount + activeOffCount + (selectedFocus ? 1 : 0);

  return (
    <div className={styles.filterDisclosure}>
      <button
        type="button"
        className={styles.filterSummary}
        aria-expanded={mobileOpen}
        aria-controls="dashboard-filter-panel"
        title={mobileOpen ? "Hide filters" : "Show filters"}
        onClick={() => setMobileOpen((open) => !open)}
      >
        <span>Filters</span>
        {activeTotal > 0 ? (
          <span className={styles.filterSummaryBadge}>{activeTotal}</span>
        ) : null}
      </button>

      <aside
        id="dashboard-filter-panel"
        className={`${styles.filterPanel} ${mobileOpen ? styles.filterPanelOpen : ""}`}
        aria-label="Filters"
      >
        {memberFeaturesEnabled ? (
          <div className={styles.filterRow}>
            <span className={styles.filterLabel}>View</span>
            <div className={styles.pillGroup}>
              {(["All", "Favorites"] as ViewFilter[]).map((view) => (
                <button
                  key={view}
                  type="button"
                  className={`${styles.pill} ${
                    activeView === view ? styles.pillActive : ""
                  }`}
                  title={view === "All" ? "Show all signals" : "Show starred only"}
                  aria-pressed={activeView === view}
                  onClick={() => onViewChange(view)}
                >
                  {view === "All" ? "All signals" : `Starred (${favoritesCount})`}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>Focus</span>
          <CategoryFilter selected={selectedFocus} onSelect={onFocusSelect} />
        </div>

        <div className={`${styles.filterRow} ${styles.domainFilterRow}`}>
          <span className={styles.filterLabelGroup}>
            <span className={styles.filterLabel}>Domains</span>
            {activeOnCount + activeOffCount > 0 ? (
              <span className={styles.filterCount}>
                {activeOnCount > 0 ? `${activeOnCount} included` : ""}
                {activeOnCount > 0 && activeOffCount > 0 ? " · " : ""}
                {activeOffCount > 0 ? `${activeOffCount} excluded` : ""}
              </span>
            ) : null}
          </span>
          <div className={styles.pillGroup}>
            {groups.map((group) => (
              <FilterPill
                key={group}
                label={group}
                state={getState(groupStates, group)}
                tone={groupToken(group)}
                description={TREND_GROUP_DESCRIPTIONS[group]}
                onCycle={() => onGroupCycle(group)}
              />
            ))}
          </div>
        </div>

        <div className={styles.filterActions}>
          <button
            type="button"
            className={styles.clearFilters}
            onClick={onClearFilters}
            disabled={!filtersActive}
            title="Clear all filters"
          >
            Clear filters
          </button>
        </div>

        <p className={styles.filterIntro}>
          <strong>Focus</strong> is an editorial lens. <strong>Domains</strong> are functional areas.
          Combine both to narrow signals.
        </p>
      </aside>
    </div>
  );
}
