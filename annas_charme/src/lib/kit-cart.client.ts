import {
  readPreviewBindings,
  readStoredCartItems,
  removeStoredCartItem,
  writeStoredCartItems,
  type StoredCartItem,
} from "./cart-preview.client";
import {
  kitLineTotal,
  kitStyleLabel,
  kitUnitPrice,
} from "./kit-pricing";

function kitSummaryTitle(item: StoredCartItem): string {
  const highlights = item.kitItems.filter(
    (line) =>
      line.includes("pony beads") ||
      line.includes("pattern") ||
      line.includes("letter beads") ||
      line.includes("charm"),
  );
  if (highlights.length > 0) {
    return highlights
      .map((line) => line.replace(/ pony beads$/i, "").replace(/ pattern bead set$/i, ""))
      .slice(0, 2)
      .join(" · ");
  }
  return item.kitItems[0] ?? "DIY Bracelet Kit";
}

function previewUrlForItem(item: StoredCartItem): string | undefined {
  const bindings = readPreviewBindings();
  if (item.previewId) {
    const match = bindings.find((b) => b.id === item.previewId);
    if (match) return match.dataUrl;
  }
  return bindings.find((b) => b.cartItemId === item.id)?.dataUrl;
}

export function diyCartQuantity(): number {
  return readStoredCartItems().reduce((sum, item) => sum + item.quantity, 0);
}

export function diyCartSubtotal(): number {
  return readStoredCartItems().reduce(
    (sum, item) => sum + kitLineTotal(item.type, item.strandCount, item.quantity),
    0,
  );
}

export function removeDiyCartItem(cartItemId: string) {
  removeStoredCartItem(cartItemId);
}

export function updateDiyCartQuantity(cartItemId: string, quantity: number) {
  const qty = Math.max(1, Math.min(10, quantity));
  const items = readStoredCartItems().map((item) =>
    item.id === cartItemId ? { ...item, quantity: qty } : item,
  );
  writeStoredCartItems(items);
}

function formatMoney(amount: number): string {
  return `₪${amount}`;
}

function renderDiyCartRow(item: StoredCartItem): HTMLLIElement {
  const li = document.createElement("li");
  li.className =
    "flex w-full flex-col border-b border-neutral-300 dark:border-neutral-700";
  li.dataset.diyCartItem = item.id;

  const previewUrl = previewUrlForItem(item);
  const unitPrice = kitUnitPrice(item.type, item.strandCount);
  const lineTotal = kitLineTotal(item.type, item.strandCount, item.quantity);
  const title = kitSummaryTitle(item);
  const style = kitStyleLabel(item.type, item.strandCount);

  li.innerHTML = `
    <div class="relative flex w-full flex-row justify-between px-1 py-4">
      <div class="absolute z-40 -ml-1 -mt-2">
        <button
          type="button"
          data-diy-remove="${item.id}"
          aria-label="Remove cart item"
          class="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-neutral-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="mx-px h-4 w-4 text-white dark:text-black">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="flex flex-row">
        <div class="relative h-16 w-16 overflow-hidden rounded-md border border-neutral-300 bg-neutral-300 dark:border-neutral-700 dark:bg-neutral-900">
          ${
            previewUrl
              ? `<img src="${previewUrl}" alt="${title}" class="h-full w-full object-cover" width="64" height="64" loading="lazy" />`
              : `<div class="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">No image</div>`
          }
        </div>
        <div class="z-30 ml-2 flex flex-row space-x-4">
          <div class="flex flex-1 flex-col text-base">
            <span class="leading-tight">DIY Bracelet Kit</span>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">${title}</p>
            <p class="text-xs text-neutral-400 dark:text-neutral-500">${style}</p>
          </div>
        </div>
      </div>
      <div class="flex h-16 flex-col justify-between">
        <p class="flex justify-end text-right text-sm">${formatMoney(lineTotal)}</p>
        <div class="ml-auto flex h-9 flex-row items-center rounded-full border border-neutral-200 dark:border-neutral-700">
          <button type="button" data-diy-qty-minus="${item.id}" class="px-2 text-sm" aria-label="Decrease quantity">−</button>
          <p class="w-6 text-center text-sm">${item.quantity}</p>
          <button type="button" data-diy-qty-plus="${item.id}" class="px-2 text-sm" aria-label="Increase quantity">+</button>
        </div>
      </div>
    </div>
  `;

  return li;
}

export function updateCartBadge(wixQty = 0) {
  const total = wixQty + diyCartQuantity();
  const badgeHost = document.querySelector<HTMLElement>("[data-cart-badge-host]");
  if (!badgeHost) return;

  let badge = badgeHost.querySelector<HTMLElement>("[data-cart-badge]");
  if (total > 0) {
    if (!badge) {
      badge = document.createElement("div");
      badge.dataset.cartBadge = "true";
      badge.className =
        "absolute right-0 top-0 -mr-2 -mt-2 h-4 w-4 rounded bg-blue-600 text-[11px] font-medium text-white flex items-center justify-center";
      badgeHost.appendChild(badge);
    }
    badge.textContent = String(total);
    badge.classList.remove("hidden");
  } else if (badge) {
    badge.remove();
  }
}

export function renderDiyCartLines() {
  const list = document.getElementById("diy-cart-lines");
  const emptyMsg = document.getElementById("cart-empty-msg");
  const cartFooter = document.getElementById("cart-footer");
  const wixList = document.getElementById("wix-cart-lines");
  if (!list) return;

  const items = readStoredCartItems();
  list.innerHTML = "";

  items.forEach((item) => {
    list.appendChild(renderDiyCartRow(item));
  });

  const wixCount = wixList?.querySelectorAll("li").length ?? 0;
  const hasItems = items.length > 0 || wixCount > 0;

  emptyMsg?.classList.toggle("hidden", hasItems);
  cartFooter?.classList.toggle("hidden", !hasItems);

  const wixQty = Number(
    document.getElementById("cart-modal")?.dataset.wixQty ?? "0",
  );
  updateCartBadge(wixQty);

  const wixSubtotal = Number(
    document.getElementById("cart-modal")?.dataset.wixSubtotal ?? "0",
  );
  const total = wixSubtotal + diyCartSubtotal();
  const totalEl = document.getElementById("cart-total-amount");
  if (totalEl) totalEl.textContent = formatMoney(total);

  list.querySelectorAll<HTMLButtonElement>("[data-diy-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.diyRemove;
      if (!id) return;
      removeDiyCartItem(id);
      renderDiyCartLines();
    });
  });

  list.querySelectorAll<HTMLButtonElement>("[data-diy-qty-minus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.diyQtyMinus;
      if (!id) return;
      const item = readStoredCartItems().find((i) => i.id === id);
      if (!item) return;
      updateDiyCartQuantity(id, item.quantity - 1);
      renderDiyCartLines();
    });
  });

  list.querySelectorAll<HTMLButtonElement>("[data-diy-qty-plus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.diyQtyPlus;
      if (!id) return;
      const item = readStoredCartItems().find((i) => i.id === id);
      if (!item) return;
      updateDiyCartQuantity(id, item.quantity + 1);
      renderDiyCartLines();
    });
  });
}
