export const CART_PREVIEW_KEY = "bracelet-cart-previews";
export const CART_PREVIEW_BINDINGS_KEY = "bracelet-cart-preview-bindings";
export const CART_ITEMS_KEY = "bracelet-cart-items";

function readStorage(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

function writeStorage(key: string, value: string) {
  localStorage.setItem(key, value);
  sessionStorage.setItem(key, value);
}

export type CartPreviewMap = Record<string, string>;

export type PreviewBinding = {
  id: string;
  cartItemId: string;
  dataUrl: string;
  createdAt: number;
};

export type StoredCartItem = {
  id: string;
  previewId?: string;
  type: "single" | "multi";
  strandCount: number;
  quantity: number;
  kitItems: string[];
};

function parseKitCheckoutJson(raw?: string | null) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readKitCheckoutPayload(): Omit<StoredCartItem, "id" | "previewId">[] {
  const stored = readStoredCartItems();
  if (stored.length > 0) {
    return stored.map(({ type, strandCount, quantity, kitItems }) => ({
      type,
      strandCount,
      quantity,
      kitItems,
    }));
  }

  const btn = document.getElementById("cart-checkout-btn");
  const fromBtn = parseKitCheckoutJson(
    btn?.getAttribute("data-kit-checkout"),
  );
  if (fromBtn.length > 0) return fromBtn;

  const el = document.getElementById("kit-checkout-data");
  return parseKitCheckoutJson(el?.textContent);
}

export async function startBraceletCheckout(
  items: Omit<StoredCartItem, "id" | "previewId">[],
): Promise<string> {
  const res = await fetch("/api/bracelet-cart-checkout", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) {
    throw new Error(data.error || "Checkout failed");
  }
  return data.url;
}

function normalizeStoredItem(
  raw: Record<string, unknown>,
  index: number,
): StoredCartItem {
  const legacyLineId = raw.lineItemId as string | undefined;
  const phantomId = "00000000-0000-0000-0000-000000000001";
  let id = raw.id as string | undefined;
  if (!id) {
    id =
      legacyLineId && legacyLineId !== phantomId
        ? legacyLineId
        : crypto.randomUUID();
  }

  return {
    id: id ?? `legacy-${index}-${crypto.randomUUID()}`,
    previewId: raw.previewId as string | undefined,
    type: (raw.type as StoredCartItem["type"]) ?? "single",
    strandCount: Number(raw.strandCount) || 5,
    quantity: Math.max(1, Number(raw.quantity) || 1),
    kitItems: Array.isArray(raw.kitItems) ? (raw.kitItems as string[]) : [],
  };
}

export function readStoredCartItems(): StoredCartItem[] {
  try {
    const parsed = JSON.parse(readStorage(CART_ITEMS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();
    return parsed.map((item, index) => {
      const normalized = normalizeStoredItem(item, index);
      if (seen.has(normalized.id)) {
        normalized.id = crypto.randomUUID();
      }
      seen.add(normalized.id);
      return normalized;
    });
  } catch {
    return [];
  }
}

export function writeStoredCartItems(items: StoredCartItem[]) {
  writeStorage(CART_ITEMS_KEY, JSON.stringify(items));
}

export function saveStoredCartItem(item: StoredCartItem) {
  const items = readStoredCartItems();
  items.push(item);
  writeStoredCartItems(items);
}

export function removeStoredCartItem(cartItemId: string) {
  const items = readStoredCartItems().filter((item) => item.id !== cartItemId);
  writeStoredCartItems(items);

  const bindings = readPreviewBindings().filter(
    (b) => b.cartItemId !== cartItemId,
  );
  writeStorage(CART_PREVIEW_BINDINGS_KEY, JSON.stringify(bindings));
}

export function readPreviewBindings(): PreviewBinding[] {
  try {
    const parsed = JSON.parse(readStorage(CART_PREVIEW_BINDINGS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((raw) => ({
      id: raw.id as string,
      cartItemId:
        (raw.cartItemId as string) ??
        (raw.lineItemId as string) ??
        crypto.randomUUID(),
      dataUrl: raw.dataUrl as string,
      createdAt: Number(raw.createdAt) || 0,
    }));
  } catch {
    return [];
  }
}

export function saveCartPreview(cartItemId: string, dataUrl: string): string {
  const bindings = readPreviewBindings();
  const id = crypto.randomUUID();
  bindings.push({ id, cartItemId, dataUrl, createdAt: Date.now() });
  writeStorage(CART_PREVIEW_BINDINGS_KEY, JSON.stringify(bindings));
  return id;
}

export function removePreviewBinding(previewId: string) {
  const binding = readPreviewBindings().find((b) => b.id === previewId);
  const bindings = readPreviewBindings().filter((b) => b.id !== previewId);
  writeStorage(CART_PREVIEW_BINDINGS_KEY, JSON.stringify(bindings));
  if (binding) removeStoredCartItem(binding.cartItemId);
}

export async function svgElementToDataUrl(
  svg: SVGSVGElement,
): Promise<string | null> {
  const viewBox = svg.viewBox.baseVal;
  const w = viewBox.width || svg.clientWidth || 230;
  const h = viewBox.height || svg.clientHeight || 230;
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#faf9f7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const svgStr = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
