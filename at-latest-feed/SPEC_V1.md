# Product & Technical Specification: Wix Web Trends Tracker

## 1. Executive Summary

**Project Name:** Web Trends & Insights Dashboard (Wix Ecosystem)

**Objective:** To build a highly interactive, premium-feeling web application that displays recent trends, news, and insights related to the web industry and the Wix ecosystem.

**Core Interaction:** A dynamic grid of widgets. Each widget displays a bite-sized snippet. Upon interaction (click), the widget fluidly expands to cover its neighboring widgets, revealing a comprehensive Insight, Analytic, and Recommendation report.

**Technology Stack:** React (Next.js), Framer Motion (Animations), Tailwind CSS (Styling), Wix Managed Headless (Backend, CMS, Auth, Infrastructure).

## 2. Design System: Wix / Apple (macOS/iOS) Hybrid

The design language merges the highly legible, editorial, and robust modularity of the Wix Design System with the fluid, translucent, and depth-oriented principles of Apple's Human Interface Guidelines (HIG).

### 2.1. Visual Foundations

**Typography**

- **Headings:** Wix Madefor (Bold, wide, excellent for editorial headers).
- **Body & Data:** SF Pro Display / SF Pro Text (or Inter as a web-safe fallback). Used for dense analytical data, ensuring macOS/iOS native readability.

**Materials & Depth (Apple HIG Vibrancy)**

- Widgets utilize Glassmorphism.
- Backgrounds are highly translucent (`rgba(255, 255, 255, 0.65)` in Light Mode, `rgba(30, 30, 30, 0.65)` in Dark Mode) with a heavy background blur (`backdrop-filter: blur(20px)`).
- **Borders:** `1px solid` semi-transparent borders (`rgba(255,255,255,0.2)`) to simulate physical glass edges.
- **Shadows:** Multi-layered, soft drop shadows that increase in spread and opacity based on the widget's Z-index (elevation).

**Color Palette**

- **Background:** Soft off-white (Light Mode) or Deep OLED Black/Charcoal (Dark Mode).
- **Accents:** iOS System Blue (`#007AFF`) combined with Wix's energetic brand accents (for example, a vibrant gradient of `#00E6A6` to `#00BFFF` for data visualizations).

**Geometry**

- "Squircle" continuous curve border-radii (`border-radius: 24px` for widgets, matching iOS/macOS windows).

### 2.2. Motion & Interaction (The "Cover" Effect)

The defining interaction is the Widget Expansion.

- **Physics:** Spring-based animations (`stiffness: 300`, `damping: 30`). No linear easing. Every movement must feel physical and interruptible.
- **The Grid Behavior:** When a widget is clicked, it does not push other grid items away (CSS Grid reflow). Instead, it elevates in the Z-axis and scales/expands seamlessly to cover its neighbors.
- **Dimming:** When a widget expands, a blurred overlay fades in behind the expanded widget but over the rest of the grid, focusing user attention entirely on the active report.

## 3. UI/UX Component Specifications

### 3.1. The Dashboard Grid & Endless Scroll

**Layout:** Responsive CSS Grid optimized to naturally prompt user exploration.

- **Desktop (1080p displays):** 5 columns horizontally. The vertical sizing of the grid and individual widgets is explicitly calculated so that exactly 3.5 rows are visible above the fold. The half-visible 4th row creates visual tension, immediately signaling extension and sparking the urge to scroll.
- **Tablet:** 3 columns.
- **Mobile:** 1 column.
- **Gap:** 24px spacing between widgets.

**Endless Scroll:** The grid features infinite pagination. As the user scrolls near the bottom of the loaded content, new trends are seamlessly fetched and appended to the grid without reloading, providing a continuous, endless stream of insights.

### 3.2. Header Filter Bar

The dashboard now prioritizes a compact filter bar inside the hero/header area rather than a side navigation widget.

- **Focus:** A single-select Focus lens row uses icon chips for editorial views such as Hype, Pro Dev, Enterprise, and Market Disruption. Clicking the active chip clears the focus.
- **Domains:** Functional-domain filters use tri-state pills (`on`, `neutral`, `off`) so users can include or exclude domains.
- **Shareability:** Domain filter state is reflected in URL query parameters. Focus is session-only and does not write to the URL.
- **Views:** The report feed supports Feed, Compact List, and Grid layout modes.

### 3.3. State 1: The Snippet Widget (Collapsed)

**Dimensions:** Height fixed to roughly `~240px` (to achieve the 3.5 rows visibility on 1080p).

**Content Hierarchy**

- **Category Badge:** e.g., `eCommerce`, `Headless`, `AI` (small, pill-shaped, top-left).
- **Date/Time:** Subtle text, top-right.
- **Title:** 2 lines maximum, truncated.
- **Trend Indicator:** A mini sparkline chart or a percentage metric (e.g., `"↑ 24% Adoption"`).
- **Hover State:** Slight scale up (`scale: 1.02`), cursor changes to pointer, shadow deepens.

### 3.4. State 2: The Full Report (Expanded)

**Dimensions:** Expands to roughly `60vw` width x `70vh` height, centered on the screen or originating from the click origin.

**Layout Structure (Scrollable interior)**

- **Hero Section:** Enlarged title, full category metadata.
- **The Insight:** A 2-3 paragraph editorial brief explaining the trend (e.g., "The rise of composable commerce in the Wix ecosystem...").
- **Analytics:** A data visualization block (using Recharts or Chart.js). Bar charts or line graphs detailing the metric.
- **Recommendation:** An actionable list of 3 bullet points for developers/agencies on how to leverage this trend.
- **Close Button:** A prominent, macOS-style circular `(X)` button fixed to the top right.

## 4. Technical Architecture

### 4.1. The Stack

- **Frontend Framework:** Next.js (App Router) or Astro. (Next.js is recommended for complex client-side animation state).
- **Backend / CMS:** Wix Managed Headless. Wix handles hosting, infrastructure, OAuth, and database (Wix Data / CMS).
- **Animation Library:** Framer Motion (`<motion.div layoutId="...">` is critical for the expand/cover animation).
- **Styling:** Tailwind CSS + custom CSS plugins for iOS-style blurs and squircles.
- **Data Fetching:** `@wix/sdk` and `@wix/data`.

### 4.2. Wix Managed Headless Strategy & Development Path

Aligning directly with Wix's official headless development documentation, this architecture is completely framework-agnostic and flexible, supporting multiple integration paths based on the developer's needs.

**Path 1: Using the Wix CLI Template (Recommended for Standalone App)**

For starting this dashboard from scratch, the fastest route is utilizing the Wix scaffolding tool. Running `npm create @wix/new headless --site-template blank` will bootstrap a Next.js project with the Wix SDK and `OAuthStrategy` pre-configured, instantly connecting the frontend to the Wix backend infrastructure.

**Path 2: Custom Stack Integration (For Existing Codebases)**

If an agency wants to embed this Web Trends Tracker into an existing application (whether built on React, Vue, Svelte, or vanilla JS), they do not need to use the CLI template. They can simply install the modular SDK (`npm install @wix/sdk @wix/data`), initialize the `createClient()` instance with their Wix Client ID, and use the exact same data-fetching logic outlined below.

**Authentication Flow**

Regardless of the chosen path, the app utilizes the SDK's `OAuthStrategy`. Because this is a public dashboard, we authenticate visitors securely by storing anonymous session tokens in cookies. This allows us to fetch CMS data while securing the backend endpoints and enabling seamless Wix Analytics tracking.

## 5. Data Schema (Wix CMS)

In the Wix Project Dashboard, we will create a Data Collection named `WebTrends`.

| Field ID | Field Name | Type | Description |
| --- | --- | --- | --- |
| `title` | Title | Text | The main headline of the trend. |
| `slug` | Slug | Text | URL-friendly identifier. |
| `category` | Category | Tags | Array of tags (e.g., `["AI", "eCommerce"]`). |
| `snippet` | Snippet | Text | 150-char brief for the collapsed widget. |
| `metricDisplay` | Metric Display | Text | Pre-formatted value, e.g. `"2 paths"`. |
| `metricCaption` | Metric Caption | Text | What the figure measures. |
| `metricTrend` | Metric Trend | Text | `up`, `down`, or `neutral`. |
| `metricSourceLabel` | Metric Source Label | Text | Attribution label. |
| `metricSourceUrl` | Metric Source URL | Text | Attribution URL. |
| `fullInsight` | Full Insight | Rich Text | The detailed editorial content. |
| `recommendations` | Recommendations | Array (Text) | 3 actionable tips. |
| `publishDate` | Publish Date | Date & Time | Sorting parameter. |

## 6. Implementation Guide & Technical Solutions

### 6.1. SDK Initialization (React/Next.js context)

To securely fetch data from Wix Headless without exposing administrative keys, we use the visitor/client OAuth strategy. This code works uniformly whether you used the Path 1 CLI template or Path 2 Custom Integration.

`lib/wixClient.js`

```js
import { createClient, OAuthStrategy } from "@wix/sdk";
import { items } from "@wix/data";
import Cookies from "js-cookie";

export const getWixClient = () => {
  return createClient({
    modules: { items },
    auth: OAuthStrategy({
      clientId: process.env.NEXT_PUBLIC_WIX_CLIENT_ID,
      tokens: JSON.parse(Cookies.get("session") || "null"),
    }),
  });
};
```

### 6.2. Fetching the Trends Data (With Endless Scroll)

To handle infinite scrolling, we modify our hook to support cursors and pagination limits.

`hooks/useTrends.js`

```js
import { useEffect, useState, useCallback } from "react";
import { getWixClient } from "../lib/wixClient";

export function useTrends() {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState(null);

  const fetchTrends = useCallback(async (isNextPage = false) => {
    const wixClient = getWixClient();
    try {
      let query = wixClient.items
        .query("WebTrends")
        .descending("publishDate")
        .limit(20); // Batch size

      if (isNextPage && cursor) query = query.skipTo(cursor);

      const response = await query.find();

      setTrends((prev) =>
        isNextPage ? [...prev, ...response.items] : response.items
      );
      setCursor(response.cursors?.next);
      setHasMore(response.hasNext());
    } catch (error) {
      console.error("Failed to fetch trends:", error);
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => {
    fetchTrends();
  }, []);

  return { trends, loading, hasMore, fetchNextPage: () => fetchTrends(true) };
}
```

### 6.3. The Grid & "Cover Neighbors" Animation Logic

Updated to enforce the 5-column layout and roughly 240px widget heights for the 3.5 rows visual tension.

`components/Dashboard.jsx`

```jsx
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard({ trends, fetchNextPage, hasMore }) {
  const [selectedId, setSelectedId] = useState(null);
  const observerTarget = useRef(null);

  // Intersection Observer for Endless Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) fetchNextPage();
      },
      { threshold: 1.0 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, fetchNextPage]);

  return (
    <div className="relative w-full min-h-screen p-8 bg-gray-50 dark:bg-zinc-900 pr-20">
      {/* 1. The Underlying Grid (5 columns for 1080p extension feel) */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {trends.map((trend) => (
          <motion.div
            layoutId={`widget-${trend._id}`}
            key={trend._id}
            id={`widget-anchor-${trend._id}`}
            onClick={() => setSelectedId(trend._id)}
            // Height constrained to ~240px to ensure 3.5 rows fit in ~1080p viewports
            className="cursor-pointer bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-white/20 shadow-sm rounded-3xl p-6 h-[240px]"
          >
            {/* Snippet Content */}
            <span className="text-xs font-bold uppercase text-blue-500">
              {trend.category[0]}
            </span>
            <h3 className="mt-2 text-xl font-bold font-wix-madefor line-clamp-2">
              {trend.title}
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
              {trend.snippet}
            </p>

            {/* Metric UI */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-2xl font-bold">{trend.metricValue}%</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Endless Scroll Trigger */}
      <div ref={observerTarget} className="h-10 w-full mt-4" />

      {/* 2. The Expanded View (Covering Neighbors) */}
      <AnimatePresence>
        {selectedId && (
          // ... (Expanded view implementation remains the same, providing full insight report)
          <div className="fixed inset-0 z-50">...</div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### 6.4. Focus Filter Logic

The current UI uses a compact Focus filter instead of the earlier side navigation concept.

- `src/lib/viewCategories.ts` defines the Focus categories and trend-to-focus mapping.
- `src/components/dashboard/CategoryFilter.tsx` renders the single-select icon chips.
- `src/components/dashboard/WebTrendsDashboard.tsx` applies the selected Focus lens in memory only.

### 6.5. Styling Nuances (Tailwind Config)

To nail the Apple macOS feel, ensure your `tailwind.config.js` is set up with custom drop shadows and blur strengths:

```js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        "wix-madefor": ['"Wix Madefor Display"', "sans-serif"],
        "sf-pro": [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          "sans-serif",
        ],
      },
      boxShadow: {
        "apple-glass":
          "0 8px 32px 0 rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.2)",
      },
    },
  },
};
```

## 7. Deployment & Maintenance

- **Wix Infrastructure:** Because we are using Wix Managed Headless, Wix provides built-in CI/CD, SSL, and global CDN hosting natively for projects created via their CLI.
- **Dashboard Management:** Content creators log directly into the Wix Project Dashboard (Business Manager) to add new trends to the CMS. The frontend automatically reflects these changes via the API.
- **Analytics Integration:** Visitor sessions maintained via `js-cookie` and Wix SDK will automatically pipe into Wix Analytics, allowing tracking of which widgets (trends) have the highest click-through and engagement rates.

## 8. Summary of Technical Constraints Satisfied

- **Wix Ecosystem Focus:** App is powered by Wix Managed Headless, Wix Data, and Wix SDK.
- **Flexible Development Paths:** Fully outlines support for both the Wix CLI Template approach and integrating directly into an existing tech stack via modular packages.
- **Expanding Grid:** Implemented via absolute Z-index elevation and Framer Motion `layoutId` to fluidly cover neighbors without breaking document flow.
- **Extension / Endless Feel:** 5-column grid strictly sized for 3.5 vertical rows visible, paired with infinite Intersection Observer loading.
- **Header Filters:** Focus chips plus tri-state domain pills provide fast scannability without side navigation.
- **Design Language:** Hybrid implementation using Glassmorphism, SF Pro typography paired with Wix Madefor, and soft drop-shadows.
