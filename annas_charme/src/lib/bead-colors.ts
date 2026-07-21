export type BeadCategory =
  | "all"
  | "reds"
  | "purples"
  | "blues"
  | "greens"
  | "yellows"
  | "neutrals"
  | "darks";

export interface BeadColor {
  name: string;
  hex: string;
  slug: string;
  image: string;
  category: BeadCategory;
}

export const BEAD_CATEGORIES: { id: BeadCategory; label: string; dot?: string }[] = [
  { id: "all", label: "All colors" },
  { id: "reds", label: "Reds & Pinks", dot: "#f43f5e" },
  { id: "purples", label: "Purples", dot: "#a78bfa" },
  { id: "blues", label: "Blues", dot: "#38bdf8" },
  { id: "greens", label: "Greens", dot: "#22c55e" },
  { id: "yellows", label: "Yellows & Oranges", dot: "#fbbf24" },
  { id: "neutrals", label: "Neutrals", dot: "#fefce8" },
  { id: "darks", label: "Darks", dot: "#171717" },
];

export const BEAD_COLORS: BeadColor[] = [
  { name: "Red", hex: "#e11d48", slug: "red", image: "/beads/red.png", category: "reds" },
  { name: "Hot Pink", hex: "#ec4899", slug: "hot-pink", image: "/beads/hot-pink.png", category: "reds" },
  { name: "Pink", hex: "#f472b6", slug: "pink", image: "/beads/pink.png", category: "reds" },
  { name: "Magenta", hex: "#c026d3", slug: "magenta", image: "/beads/magenta.png", category: "purples" },
  { name: "Purple", hex: "#7c3aed", slug: "purple", image: "/beads/purple.png", category: "purples" },
  { name: "Blue", hex: "#3b82f6", slug: "blue", image: "/beads/blue.png", category: "blues" },
  { name: "Mint", hex: "#6ee7b7", slug: "mint", image: "/beads/mint.png", category: "greens" },
  { name: "Green", hex: "#22c55e", slug: "green", image: "/beads/green.png", category: "greens" },
  { name: "Sage", hex: "#86efac", slug: "sage", image: "/beads/sage.png", category: "greens" },
  { name: "Lavender", hex: "#a78bfa", slug: "lavender", image: "/beads/lavender.png", category: "purples" },
  { name: "Lime", hex: "#bef264", slug: "lime", image: "/beads/lime.png", category: "greens" },
  { name: "Teal", hex: "#14b8a6", slug: "teal", image: "/beads/teal.png", category: "blues" },
  { name: "Yellow", hex: "#facc15", slug: "yellow", image: "/beads/yellow.png", category: "yellows" },
  { name: "Mustard", hex: "#ca8a04", slug: "mustard", image: "/beads/mustard.png", category: "yellows" },
  { name: "Tan", hex: "#d6b88a", slug: "tan", image: "/beads/tan.png", category: "neutrals" },
  { name: "Cream", hex: "#fefce8", slug: "cream", image: "/beads/cream.png", category: "neutrals" },
  { name: "White", hex: "#ffffff", slug: "white", image: "/beads/white.png", category: "neutrals" },
  { name: "Pearl", hex: "#e8e8e8", slug: "pearl", image: "/beads/pearl.png", category: "neutrals" },
  { name: "Chocolate", hex: "#78350f", slug: "chocolate", image: "/beads/chocolate.png", category: "darks" },
  { name: "Silver", hex: "#9ca3af", slug: "silver", image: "/beads/silver.png", category: "neutrals" },
  { name: "Gold", hex: "#d97706", slug: "gold", image: "/beads/gold.png", category: "yellows" },
  { name: "Black", hex: "#171717", slug: "black", image: "/beads/black.png", category: "darks" },
];

export const BEAD_COLOR_MAP = new Map(BEAD_COLORS.map((c) => [c.hex, c.name]));
