import { AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  cycleState,
  facetMatches,
  getState,
  isAllNeutral,
  serializeGroupFilters,
} from "../../lib/filterState";
import { TREND_GROUPS } from "../../lib/trends";
import { focusForTrend } from "../../lib/viewCategories";
import type {
  FilterStateMap,
  TrendGroup,
  ViewCategoryId,
  ViewMode,
  WebTrend,
} from "../../types/trends";
import { LatestWordmark } from "../brand/LatestWordmark";
import { FilterPanel } from "./FilterPanel";
import { TrendCard } from "./TrendCard";
import { TrendModal } from "./TrendModal";
import { SearchInput } from "./SearchInput";
import { SortControl, type SortMode } from "./SortControl";
import { ViewSwitcher } from "./ViewSwitcher";
import styles from "./dashboard.module.css";

type ViewFilter = "All" | "Favorites";

type FavoritesApiResponse = {
  ok?: boolean;
  favorites?: string[];
};

const VIEW_MODE_STORAGE_KEY = "trendViewMode.v2";
const MOBILE_VIEW_QUERY = "(max-width: 767px)";

function getDefaultViewMode(): ViewMode {
  if (typeof window === "undefined") {
    return "grid";
  }
  return window.matchMedia(MOBILE_VIEW_QUERY).matches ? "feed" : "grid";
}

function getStoredViewMode(): ViewMode {
  if (typeof window === "undefined") {
    return "grid";
  }

  const savedViewMode = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return savedViewMode === "feed" ||
    savedViewMode === "list" ||
    savedViewMode === "grid"
    ? savedViewMode
    : getDefaultViewMode();
}

interface WebTrendsDashboardProps {
  memberFeaturesEnabled?: boolean;
  initialTrends?: WebTrend[];
  initialGroupStates?: FilterStateMap;
  usedFallback?: boolean;
}

export function WebTrendsDashboard({
  memberFeaturesEnabled = false,
  initialTrends = [],
  initialGroupStates = {},
  usedFallback = false,
}: WebTrendsDashboardProps) {
  const [trends] = useState<WebTrend[]>(initialTrends);
  const [selectedTrend, setSelectedTrend] = useState<WebTrend | null>(null);
  const [loading] = useState(false);
  const [groupStates, setGroupStates] = useState<FilterStateMap>(initialGroupStates);
  const [selectedFocus, setSelectedFocus] = useState<ViewCategoryId | null>(null);
  const [activeView, setActiveView] = useState<ViewFilter>("All");
  // Start from a deterministic SSR-safe value (desktop default), then adopt the
  // stored or viewport-based mode after mount. Avoid list during hydration —
  // Framer layout + list grid caused first-render indentation.
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [viewModeHydrated, setViewModeHydrated] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoritePendingIds, setFavoritePendingIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  useEffect(() => {
    setViewMode(getStoredViewMode());
    setViewModeHydrated(true);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedSearchQuery(searchQuery.trim().toLowerCase()),
      150,
    );
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    if (!memberFeaturesEnabled) {
      setFavoriteIds([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/favorites");
        const result = (await response.json()) as FavoritesApiResponse;
        if (!cancelled && response.ok && result.ok) {
          setFavoriteIds(result.favorites ?? []);
        }
      } catch {
        if (!cancelled) {
          setFavoriteIds([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [memberFeaturesEnabled]);

  useEffect(() => {
    // Don't persist the pre-hydration placeholder value.
    if (!viewModeHydrated) return;
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode, viewModeHydrated]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedTrend(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (selectedTrend) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedTrend]);

  useEffect(() => {
    const filterParams = serializeGroupFilters(groupStates);
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.delete("on");
    currentParams.delete("off");
    currentParams.delete("cap_on");
    currentParams.delete("cap_off");

    for (const [key, value] of filterParams.entries()) {
      currentParams.set(key, value);
    }

    const queryString = currentParams.toString();
    const nextUrl = `${window.location.pathname}${
      queryString ? `?${queryString}` : ""
    }${window.location.hash}`;

    window.history.replaceState(null, "", nextUrl);
  }, [groupStates]);

  const filteredTrends = useMemo(() => {
    const matchingTrends = trends.filter((trend) => {
      const groupMatch = facetMatches(groupStates, [trend.group]);
      const focusMatch =
        selectedFocus === null ||
        focusForTrend(trend.id, trend.focus).includes(selectedFocus);
      const favoriteMatch =
        activeView === "All" ||
        (memberFeaturesEnabled && favoriteIds.includes(trend.id));
      const searchMatch =
        !debouncedSearchQuery ||
        [trend.title, trend.snippet, trend.group, ...trend.category]
          .join(" ")
          .toLowerCase()
          .includes(debouncedSearchQuery);
      return groupMatch && focusMatch && favoriteMatch && searchMatch;
    });

    return [...matchingTrends].sort((left, right) => {
      const leftDate = Date.parse(left.publishDate);
      const rightDate = Date.parse(right.publishDate);
      return sortMode === "newest" ? rightDate - leftDate : leftDate - rightDate;
    });
  }, [
    trends,
    groupStates,
    selectedFocus,
    activeView,
    favoriteIds,
    memberFeaturesEnabled,
    debouncedSearchQuery,
    sortMode,
  ]);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const favoritePendingSet = useMemo(() => new Set(favoritePendingIds), [favoritePendingIds]);
  const filtersActive = !isAllNeutral(groupStates) || selectedFocus !== null;
  const viewClassName =
    viewMode === "list"
      ? styles.listView
      : viewMode === "grid"
        ? styles.gridView
        : styles.feedView;

  const cycleGroup = (group: TrendGroup) => {
    setGroupStates((current) => ({
      ...current,
      [group]: cycleState(getState(current, group)),
    }));
  };

  const clearFilters = () => {
    setGroupStates({});
    setSelectedFocus(null);
  };

  const selectGroup = (group: TrendGroup) => {
    setGroupStates((current) => ({ ...current, [group]: "on" }));
  };

  const toggleFavorite = async (trend: WebTrend) => {
    if (!memberFeaturesEnabled) {
      return;
    }

    if (favoritePendingSet.has(trend.id)) {
      return;
    }

    const isFavorite = favoriteSet.has(trend.id);
    setFavoritePendingIds((current) => [...current, trend.id]);

    try {
      const response = await fetch(
        isFavorite
          ? `/api/favorites?trendId=${encodeURIComponent(trend.id)}`
          : "/api/favorites",
        isFavorite
          ? { method: "DELETE" }
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                trendId: trend.id,
                trendTitle: trend.title,
              }),
            },
      );

      const result = await response.json();
      if (response.ok && result?.ok) {
        setFavoriteIds((current) => {
          if (isFavorite) {
            return current.filter((id) => id !== trend.id);
          }

          return current.includes(trend.id) ? current : [...current, trend.id];
        });
      }
    } catch {
      // Keep the previous UI state when the request fails.
    } finally {
      setFavoritePendingIds((current) => current.filter((id) => id !== trend.id));
    }
  };

  return (
    <div className={styles.pageShell}>
      <div className={styles.backgroundGlowLeft} />
      <div className={styles.backgroundGlowRight} />

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>Web Industry Signals</div>
          <h1 className={styles.heroTitle}>
            <LatestWordmark height={64} className={styles.heroWordmark} />
          </h1>
          <FilterPanel
            memberFeaturesEnabled={memberFeaturesEnabled}
            activeView={activeView}
            onViewChange={setActiveView}
            favoritesCount={favoriteIds.length}
            groups={TREND_GROUPS}
            groupStates={groupStates}
            onGroupCycle={cycleGroup}
            selectedFocus={selectedFocus}
            onFocusSelect={setSelectedFocus}
            filtersActive={filtersActive}
            onClearFilters={clearFilters}
          />
        </div>
      </section>

      <section className={styles.feedSection}>
        <div className={styles.feedMain}>
          <div className={styles.feedToolbar}>
            <span className={styles.feedToolbarCount}>
              {loading ? "› fetching @latest…" : `${filteredTrends.length} signals`}
            </span>
            <div className={styles.feedToolbarControls}>
              {usedFallback ? (
                <span className={styles.fallbackBadge} title="Live CMS data unavailable">
                  ● sample data
                </span>
              ) : null}
              <SearchInput value={searchQuery} onChange={setSearchQuery} />
              <SortControl value={sortMode} onChange={setSortMode} />
              <ViewSwitcher activeView={viewMode} onChange={setViewMode} />
            </div>
          </div>

          <div className={viewClassName}>
            {filteredTrends.map((trend) => (
              <TrendCard
                key={trend.id}
                anchorId={`trend-anchor-${trend.id}`}
                trend={trend}
                viewMode={viewMode}
                isMuted={Boolean(selectedTrend && selectedTrend.id !== trend.id)}
                onSelect={setSelectedTrend}
                isFavorite={favoriteSet.has(trend.id)}
                favoritePending={favoritePendingSet.has(trend.id)}
                onToggleFavorite={toggleFavorite}
                onGroupSelect={selectGroup}
                memberFeaturesEnabled={memberFeaturesEnabled}
              />
            ))}
          </div>

          {!loading && filteredTrends.length === 0 ? (
            <div className={styles.emptyState}>
              › no signals match your query{" "}
              <span className={styles.cursor}>▮</span>
            </div>
          ) : null}
        </div>
      </section>

      <AnimatePresence>
        {selectedTrend ? (
          <TrendModal
            key={selectedTrend.id}
            trend={selectedTrend}
            onClose={() => setSelectedTrend(null)}
            isFavorite={favoriteSet.has(selectedTrend.id)}
            favoritePending={favoritePendingSet.has(selectedTrend.id)}
            onToggleFavorite={toggleFavorite}
            memberFeaturesEnabled={memberFeaturesEnabled}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
