#!/usr/bin/env python3
"""Convert inkflow-academy/index.html into src/pages/index.astro with Wix integrations."""
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT = Path("/tmp/inkflow-audit")
LIVE = Path("/tmp/inkflow-live.html")

BOOK_MODAL_CSS = """
/* ── BOOK / CONTACT MODALS (Wix Bookings + CRM) ── */
.book-modal{position:fixed;inset:0;z-index:850;display:none;align-items:center;justify-content:center;padding:1.25rem}
.book-modal.open{display:flex}
.book-backdrop{position:absolute;inset:0;background:rgba(12,10,24,.78);backdrop-filter:blur(8px)}
.book-card{position:relative;background:var(--paper);color:var(--ink);max-width:26rem;width:100%;padding:2rem 1.75rem;border-radius:2px;box-shadow:0 28px 90px rgba(0,0,0,.55);max-height:min(90vh,720px);overflow-y:auto}
.book-close{position:absolute;top:.65rem;right:.75rem;background:none;border:none;font-size:1.65rem;line-height:1;cursor:pointer;color:var(--muted);padding:.25rem}
.book-title{font-family:'Cormorant Garamond',serif;font-size:1.75rem;margin:.25rem 0 .75rem}
.book-note{font-size:.88rem;color:var(--muted);margin-bottom:1rem;line-height:1.55}
.book-field{width:100%;padding:.65rem .75rem;margin-bottom:.65rem;border:1px solid var(--wash);background:rgba(255,255,255,.55);font-family:inherit;font-size:.92rem;border-radius:2px}
.book-field:focus{outline:2px solid rgba(201,160,40,.45);border-color:var(--gold)}
.book-slots{display:grid;gap:.5rem;margin-bottom:1rem}
.book-slot{display:flex;flex-direction:column;gap:.15rem;padding:.7rem .85rem;text-align:left;background:rgba(12,10,24,.04);border:1px solid var(--wash);cursor:pointer;font:inherit;border-radius:2px;transition:border-color .2s,background .2s}
.book-slot:hover,.book-slot.sel{border-color:var(--gold);background:rgba(201,160,40,.12)}
.book-slot b{font-weight:600;font-size:.92rem}
.book-slot span{font-size:.78rem;color:var(--muted)}
.book-msg{font-size:.82rem;color:var(--seal);margin-top:.5rem;text-align:center}
"""

COURSE_BLOCK = r"""
// ── COURSE SELECTION ──
(function(){
  const cards     = document.querySelectorAll('.cc[data-course]');
  const summary   = document.getElementById('ccSelection');
  const reserveBtn = document.getElementById('reserve');

  const sel = () => Array.from(cards).filter(c => c.classList.contains('selected'));

  function render() {
    const selected = sel();
    summary.innerHTML = selected.length === 0 ? ''
      : `Selected: <strong>${selected.map(c => c.dataset.course).join(' + ')}</strong> &mdash; ${selected.map(c => c.dataset.price).join(' + ')}`;
  }

  reserveBtn.addEventListener('click', e => {
    e.preventDefault();
    const selected = sel();
    if (selected.length === 0) {
      summary.innerHTML = '<span style="color:var(--seal)">← Please choose a course above first</span>';
      cards.forEach(c => { c.classList.remove('needs-pick'); void c.offsetWidth; c.classList.add('needs-pick'); });
      setTimeout(() => cards.forEach(c => c.classList.remove('needs-pick')), 500);
      cards[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    if (typeof window.openBooking === 'function') {
      window.openBooking(selected[0].dataset.course);
    }
  });

  cards.forEach(card => {
    card.addEventListener('click', () => {
      const wasSelected = card.classList.contains('selected');
      cards.forEach(c => c.classList.remove('selected'));
      if (!wasSelected) card.classList.add('selected');
      render();
    });
  });

  render();
})();
"""

CART_BLOCK_START = "// ── CART ──"
CART_BLOCK = r"""
// ── CART ──
(function(){
  const panel    = document.getElementById('cartPanel');
  const overlay  = document.getElementById('cartOverlay');
  const badge    = document.getElementById('cartBadge');
  const itemsEl  = document.getElementById('cartItems');
  const emptyEl  = document.getElementById('cartEmpty');
  const totalEl  = document.getElementById('cartTotal');
  const checkout = document.getElementById('cartCheckout');

  let cart = {};

  let warmSig = null, warmUrl = null, warmTimer;
  const cartSig = () => JSON.stringify(Object.entries(cart).map(([id, i]) => [id, i.qty]).sort());
  const cartPayload = () => Object.entries(cart).map(([id, i]) => ({ id, name: i.name, price: i.price, qty: i.qty }));
  function prewarm() {
    clearTimeout(warmTimer);
    warmTimer = setTimeout(async () => {
      if (!totalItems()) { warmSig = warmUrl = null; return; }
      const sig = cartSig();
      if (sig === warmSig && warmUrl) return;
      try {
        const res = await fetch('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: cartPayload() }) });
        const data = await res.json();
        if (res.ok && data.url && cartSig() === sig) { warmSig = sig; warmUrl = data.url; }
      } catch {}
    }, 400);
  }

  function openCart()  { panel.classList.add('open'); overlay.classList.add('show'); document.body.style.overflow='hidden'; prewarm(); }
  function closeCart() { panel.classList.remove('open'); overlay.classList.remove('show'); document.body.style.overflow=''; }

  document.getElementById('cartToggle').addEventListener('click', openCart);
  document.getElementById('cartClose').addEventListener('click', closeCart);
  overlay.addEventListener('click', closeCart);

  function totalItems() { return Object.values(cart).reduce((s,i)=>s+i.qty,0); }
  function totalPrice() { return Object.values(cart).reduce((s,i)=>s+i.price*i.qty,0); }

  function render() {
    const count = totalItems();
    badge.textContent = count;
    badge.classList.toggle('show', count > 0);
    totalEl.textContent = '€ ' + totalPrice().toLocaleString();
    checkout.disabled = count === 0;

    document.querySelectorAll('.sp-add').forEach(btn => {
      const inCart = !!cart[btn.dataset.id];
      btn.classList.toggle('in-cart', inCart);
      btn.textContent = inCart ? 'In Cart ✓' : 'Add to Cart';
    });

    const existing = itemsEl.querySelectorAll('.cart-item');
    existing.forEach(el => el.remove());
    const ids = Object.keys(cart);
    emptyEl.style.display = ids.length ? 'none' : '';
    ids.forEach(id => {
      const item = cart[id];
      const row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = `
        <div style="flex:1">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">€ ${item.price.toLocaleString()} each</div>
        </div>
        <div class="cart-qty">
          <button data-action="dec" data-id="${id}">−</button>
          <span>${item.qty}</span>
          <button data-action="inc" data-id="${id}">+</button>
        </div>`;
      itemsEl.appendChild(row);
    });
    prewarm();
  }

  itemsEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (!cart[id]) return;
    if (btn.dataset.action === 'inc') { cart[id].qty++; }
    else { cart[id].qty--; if (cart[id].qty <= 0) delete cart[id]; }
    render();
  });

  document.querySelectorAll('.sp-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const { id, name, price } = btn.dataset;
      if (cart[id]) { delete cart[id]; }
      else { cart[id] = { name, price: parseInt(price), qty: 1 }; }
      render();
    });
  });

  checkout.addEventListener('click', async () => {
    if (!totalItems()) return;
    if (warmUrl && warmSig === cartSig()) { window.location.href = warmUrl; return; }
    const original = checkout.textContent;
    checkout.disabled = true; checkout.textContent = 'Preparing checkout…';
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: cartPayload() }),
      });
      const data = await res.json();
      if (res.ok && data.url) { window.location.href = data.url; return; }
      throw new Error(data.error || 'No checkout URL');
    } catch (err) {
      console.error('checkout', err);
      checkout.textContent = 'Checkout unavailable — try again';
      setTimeout(() => { checkout.textContent = original; checkout.disabled = totalItems() === 0; }, 2800);
    }
  });

  render();
})();
"""


def fix_asset_paths(html: str) -> str:
    for folder in ("images", "video", "audio"):
        html = html.replace(f'src="{folder}/', f'src="/{folder}/')
        html = html.replace(f"href='{folder}/", f"href='/{folder}/")
        html = html.replace(f'href="{folder}/', f'href="/{folder}/')
        html = html.replace(f'content="{folder}/', f'content="/{folder}/')
        html = html.replace(f"url({folder}/", f"url(/{folder}/")
    return html


def replace_block(html: str, start_marker: str, end_marker: str, new_block: str) -> str:
    i = html.find(start_marker)
    if i < 0:
        raise SystemExit(f"Missing marker: {start_marker}")
    j = html.find(end_marker, i)
    if j < 0:
        raise SystemExit(f"Missing end marker after {start_marker}")
    return html[:i] + new_block.strip() + "\n\n" + html[j:]


def extract_wix_blocks(live_html: str) -> str:
    start = live_html.find("<!-- ── Live booking modal")
    end = live_html.find("</script> <!-- ── PEN HOLOGRAM", start)
    if start < 0 or end < 0:
        end = live_html.find("</script> <script src=https://static.parastorage.com", start)
    if start < 0 or end < 0:
        raise SystemExit("Could not extract Wix blocks from live HTML")
    chunk = live_html[start:end + len("</script>")]
    return chunk


def main():
    public = ROOT / "public"
    for folder in ("images", "video", "audio"):
        src = AUDIT / folder
        dst = public / folder
        if src.exists():
            if dst.exists():
                shutil.rmtree(dst)
            shutil.copytree(src, dst)

    html_path = ROOT / "index.html"
    html = html_path.read_text(encoding="utf-8")
    html = fix_asset_paths(html)

    if BOOK_MODAL_CSS.strip() not in html:
        html = html.replace("</style>", BOOK_MODAL_CSS + "\n</style>", 1)

    html = html.replace(
        '<li><a href="#courses" class="cta">Book a Session</a></li>',
        '<li><a href="#courses" class="cta" id="bookCta">Book a Session</a></li>\n'
        '    <li><a href="#contact" id="contactCta">Contact</a></li>\n'
        '    <li><a href="/api/auth/login?returnToUrl=/" id="authLink">Log in</a></li>',
        1,
    )

    html = html.replace(
        '<a href="mailto:hello@tongshuacademy.com" class="btn btn-seal" id="reserve">Reserve a Spot</a>',
        '<button type="button" class="btn btn-seal" id="reserve">Reserve a Spot</button>',
        1,
    )

    html = html.replace(
        '<a href="mailto:hello@tongshuacademy.com">hello@tongshuacademy.com</a>',
        '<a href="#" id="footEmail">hello@tongshuacademy.com</a>',
        1,
    )

    html = replace_block(html, "// ── COURSE SELECTION ──", "// ── FAQ ──", COURSE_BLOCK)
    html = replace_block(html, CART_BLOCK_START, "// ── LANGUAGE TOGGLE ──", CART_BLOCK)

    live = LIVE.read_text(encoding="utf-8")
    wix_blocks = extract_wix_blocks(live)
    html = html.replace("</body>", wix_blocks + "\n\n</body>", 1)

    head_match = re.search(r"<head>(.*)</head>", html, re.DOTALL | re.IGNORECASE)
    body_match = re.search(r"<body[^>]*>(.*)</body>", html, re.DOTALL | re.IGNORECASE)
    if not head_match or not body_match:
        raise SystemExit("Could not parse HTML")

    head_inner = head_match.group(1).strip()
    body_inner = body_match.group(1).strip()

    style_match = re.search(r"<style>(.*?)</style>", head_inner, re.DOTALL)
    if not style_match:
        raise SystemExit("No style block")
    style = style_match.group(1).strip()
    head_without_style = head_inner.replace(style_match.group(0), "").strip()

    astro = f"""---
export const prerender = false;
---
<!DOCTYPE html>
<html lang="en">
<head>
{head_without_style}
<style is:global>
{style}
</style>
</head>
<body>
{body_inner}
</body>
</html>
"""

    out = ROOT / "src" / "pages" / "index.astro"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(astro, encoding="utf-8")
    html_path.unlink()
    print(f"Wrote {out} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
