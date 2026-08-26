import { useState, type FormEvent } from 'react';
import { items } from '@wix/data';

type Status = 'idle' | 'submitting' | 'done' | 'error';

const SEATING = ['By the fire', 'By the window', 'No preference'];

/**
 * Reservation request → Wix Data `Reservations` inquiry collection.
 * Hydrated `client:idle`: the form is below the fold, so it can wait for the
 * main thread to be free before wiring up.
 */
export default function ReservationForm() {
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get('name') ?? '').trim(),
      phone: String(data.get('phone') ?? '').trim(),
      date: String(data.get('date') ?? ''),
      partySize: Number(data.get('partySize') ?? 2),
      seatingPreference: String(data.get('seatingPreference') ?? ''),
      note: String(data.get('note') ?? '').trim(),
      status: 'New',
    };

    try {
      await items.insert('Reservations', payload);
      setStatus('done');
      form.reset();
    } catch (err) {
      console.error('Reservation insert failed', err);
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="reservation-success" role="status">
        <p className="font-display text-2xl text-[var(--color-text)]">Request in.</p>
        <p className="measure mt-3 text-[var(--color-text-muted)]">
          We'll call to confirm and tell you what's looking good on tomorrow's board. Come
          hungry.
        </p>
        <button
          type="button"
          className="btn-ghost mt-6"
          onClick={() => setStatus('idle')}
        >
          Request another table
        </button>
      </div>
    );
  }

  return (
    <form className="reservation-form" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" htmlFor="name">
          <input id="name" name="name" type="text" autoComplete="name" required />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <input id="phone" name="phone" type="tel" autoComplete="tel" required />
        </Field>
        <Field label="Date" htmlFor="date">
          <input id="date" name="date" type="date" required />
        </Field>
        <Field label="Party size" htmlFor="partySize">
          <select id="partySize" name="partySize" defaultValue="2" required>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'guest' : 'guests'}
              </option>
            ))}
            <option value="9">9+ (we'll call)</option>
          </select>
        </Field>
      </div>

      <Field label="Seating preference" htmlFor="seatingPreference" className="mt-5">
        <select id="seatingPreference" name="seatingPreference" defaultValue={SEATING[2]}>
          {SEATING.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Note" htmlFor="note" hint="Allergies, a vegetable plate, a birthday — tell us." className="mt-5">
        <textarea id="note" name="note" rows={3} />
      </Field>

      {status === 'error' && (
        <p className="mt-4 text-sm text-[var(--color-accent)]" role="alert">
          Something went wrong sending that. Call the harbor line and we'll sort it:{' '}
          <a href="tel:+34943000142" className="underline">
            +34 943 000 142
          </a>
          .
        </p>
      )}

      <button type="submit" className="btn-primary mt-7 w-full sm:w-auto" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending…' : 'Request a table'}
      </button>

      <p className="mt-4 text-sm text-[var(--color-text-muted)]">
        No deposit, no account. Just your number so we can confirm the table and the time.
      </p>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  className = '',
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className={`field ${className}`}>
      <span className="field-label">{label}</span>
      {hint && <span className="field-hint">{hint}</span>}
      {children}
    </label>
  );
}
