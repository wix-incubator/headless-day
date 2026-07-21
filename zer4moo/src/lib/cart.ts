// Client-side cart (localStorage). The "send" flow is theatrical — no real payment.
export type CartLine = {
  id: string;
  bouquetName: string;
  bouquetSlug?: string;
  image?: string;
  stems: { id: string; name: string; price: number }[];
  unitPrice: number; // sum of stems + add-ons
  addOns: { name: string; price: number }[];
  cowSlug: string;
  cowName: string;
  cowPortrait?: string;
  giftMessage: string;
};

const KEY = 'zer4moo-cart';
const EVT = 'zer4moo:cart';

export function getCart(): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveCart(lines: CartLine[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function addToCart(line: CartLine) {
  const lines = getCart();
  lines.push(line);
  saveCart(lines);
}

export function removeLine(id: string) {
  saveCart(getCart().filter((l) => l.id !== id));
}

export function clearCart() {
  saveCart([]);
}

export function cartCount(): number {
  return getCart().length;
}

export function cartTotal(): number {
  return getCart().reduce((sum, l) => sum + l.unitPrice, 0);
}

export function onCartChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener('storage', handler);
  };
}

export function newId(): string {
  return 'line-' + Math.random().toString(36).slice(2, 10);
}
