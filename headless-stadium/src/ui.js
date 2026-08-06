import { tierById } from './data.js';
import { googleCalendarUrl, downloadIcs } from './calendar.js';
import { fetchWatchParty, registerForWatchParty } from './wix.js';

const $ = (id) => document.getElementById(id);

export function initUI(event, actions) {
  // fixture bar — team colors come from the headless data layer
  $('fx-home').textContent = event.home.name;
  $('fx-home').style.color = event.home.uiColor || event.home.color;
  $('fx-away').textContent = event.away.name;
  $('fx-away').style.color = event.away.uiColor || event.away.color;
  $('fx-score').textContent = `${event.score.home} : ${event.score.away}`;
  $('fx-meta').textContent = `${event.competition} · ${event.kickoff} · ${event.venue}`;
  $('fixture').hidden = false;

  // legend
  const legend = $('legend');
  legend.innerHTML = '<div class="legend-title">Price tiers</div>';
  for (const tier of event.priceTiers) {
    const row = document.createElement('div');
    row.className = 'legend-row';
    row.innerHTML = `<span class="legend-swatch" style="background:${tier.color}"></span>
      <span>${tier.name}</span>
      <span class="legend-price">from ${event.currency}${tier.price}</span>`;
    legend.appendChild(row);
  }
  legend.hidden = false;

  $('btn-zoom-in').addEventListener('click', () => actions.zoom(0.8));
  $('btn-zoom-out').addEventListener('click', () => actions.zoom(1.25));
  $('btn-rotate').addEventListener('click', () => actions.toggleRotate());
  $('btn-reset').addEventListener('click', () => actions.resetView());
  $('card-close').addEventListener('click', () => actions.closeCard());
  $('btn-back').addEventListener('click', () => actions.exitSeat());
  $('btn-preview').addEventListener('click', () => actions.previewSeat());
  $('btn-reserve').addEventListener('click', () => actions.reserve());

  initCalendar(event);
  initWatchParty();
}

// ---------------------------------------------------- Wix Campus watch party

// Free RSVP registration against the live Wix Events event. The CTA only
// appears once the event resolves, so a missing/closed event hides the flow.
function initWatchParty() {
  // Deferred to idle: this is the first call that pulls in the Wix SDK chunk,
  // and it must not compete with the arena's first frames.
  const load = () =>
    fetchWatchParty().then((party) => {
      if (!party) return;
      $('watch-title').textContent = party.title;
      $('watch-meta').textContent = `${party.when} · ${party.venue}`;
      $('watch-blurb').textContent = party.blurb;
      $('btn-watch').hidden = false;
    });
  if (window.requestIdleCallback) requestIdleCallback(load, { timeout: 3000 });
  else setTimeout(load, 1200);

  const modal = $('watch-modal');
  const error = $('watch-error');
  $('btn-watch').addEventListener('click', () => {
    modal.hidden = false;
    $('watch-first').focus();
  });
  const close = () => (modal.hidden = true);
  $('watch-close').addEventListener('click', close);
  modal.addEventListener('pointerdown', (e) => {
    if (e.target === modal) close(); // click on the backdrop, not the dialog
  });

  $('watch-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = $('watch-first').value.trim();
    const lastName = $('watch-last').value.trim();
    const email = $('watch-email').value.trim();
    error.hidden = true;
    if (!firstName || !lastName || !/.+@.+\..+/.test(email)) {
      error.textContent = 'Please fill in your first name, last name and a valid email.';
      error.hidden = false;
      return;
    }
    const submit = $('watch-submit');
    submit.disabled = true;
    submit.textContent = 'Registering…';
    try {
      await registerForWatchParty({ firstName, lastName, email });
      $('watch-form').hidden = true;
      $('watch-done').hidden = false;
    } catch (err) {
      console.error(err);
      error.textContent = 'Registration failed — you may already be registered with this email.';
      error.hidden = false;
    } finally {
      submit.disabled = false;
      submit.textContent = 'Register free';
    }
  });
}

// "Add to calendar" — a small popover on the fixture bar with the two link
// styles people actually use; the URLs/ICS are built from the event data.
function initCalendar(event) {
  const menu = $('cal-menu');
  if (!event.startsAt) return; // no concrete date — keep the button hidden
  $('btn-cal').hidden = false;
  $('btn-cal').addEventListener('click', (e) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    menu.style.left = `${Math.min(r.left, window.innerWidth - 200)}px`;
    menu.style.top = `${r.bottom + 8}px`;
    menu.hidden = !menu.hidden;
  });
  $('cal-google').addEventListener('click', () => {
    window.open(googleCalendarUrl(event), '_blank', 'noopener');
    menu.hidden = true;
  });
  $('cal-ics').addEventListener('click', () => {
    downloadIcs(event);
    menu.hidden = true;
  });
  window.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== $('btn-cal')) menu.hidden = true;
  });
}

// ------------------------------------------------------------ hover tooltip

export function showSeatTip(event, rec, seated = false) {
  const tier = tierById(event, rec.tierId);
  $('tip-loc').textContent = `Block ${rec.block} · Row ${rec.row} · Seat ${rec.seat}`;
  $('tip-tier').textContent = tier.name;
  const price = $('tip-price');
  price.textContent = rec.available ? `${event.currency}${rec.price}` : 'Sold out';
  price.classList.toggle('sold', !rec.available);
  $('tip-hop').hidden = !seated;
  $('seat-tip').hidden = false;
}

export function moveSeatTip(x, y) {
  const el = $('seat-tip');
  // keep the tip inside the viewport, flipping sides near the edges
  const pad = 14;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  let left = x + pad;
  let top = y + pad;
  if (left + w > window.innerWidth - 8) left = x - w - pad;
  if (top + h > window.innerHeight - 8) top = y - h - pad;
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}

export function hideSeatTip() {
  $('seat-tip').hidden = true;
}

export function setRotateOn(on) {
  $('btn-rotate').classList.toggle('on', on);
}

let toastTimer = null;
export function toast(msg, ms = 3200) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), ms);
}

export function showSeatCard(event, rec, inSeatView) {
  const tier = tierById(event, rec.tierId);
  $('card-tier').textContent = tier.name;
  $('card-price').textContent = `${event.currency}${rec.price}`;
  $('card-loc').textContent = `Block ${rec.block} · Row ${rec.row} · Seat ${rec.seat}`;
  $('card-blurb').textContent = tier.blurb;
  const avail = $('card-avail');
  avail.textContent = rec.available ? 'Available' : 'Sold out';
  avail.className = `chip${rec.available ? '' : ' sold'}`;
  $('card-stand').textContent = rec.stand;
  const reserve = $('btn-reserve');
  reserve.disabled = !rec.available;
  reserve.textContent = rec.available ? 'Buy this seat' : 'Unavailable';
  $('btn-back').hidden = !inSeatView;
  $('btn-preview').hidden = inSeatView;
  // Seated: collapse to a slim bar so the pitch stays visible and other seats
  // stay clickable — seat view doubles as a browsing mode.
  $('seat-card').classList.toggle('mini', inSeatView);
  $('seat-card').hidden = false;
}

export function setReserveBusy(label) {
  const reserve = $('btn-reserve');
  reserve.disabled = true;
  reserve.textContent = label;
}

export function resetReserve(rec) {
  const reserve = $('btn-reserve');
  reserve.disabled = !rec.available;
  reserve.textContent = rec.available ? 'Buy this seat' : 'Unavailable';
}

export function hideSeatCard() {
  $('seat-card').hidden = true;
}

export function setHint(text) {
  const el = $('hint');
  if (text) {
    el.textContent = text;
    el.hidden = false;
  } else {
    el.hidden = true;
  }
}

export function loaderProgress(pct, label) {
  $('loader-fill').style.width = `${Math.round(pct * 100)}%`;
  if (label) $('loader-status').textContent = label;
}

export function loaderDone() {
  const el = $('loader');
  el.classList.add('done');
  setTimeout(() => el.remove(), 900);
}
