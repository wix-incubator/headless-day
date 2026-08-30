import { useEffect, useState } from 'react';
import { items } from '@wix/data';

type Props = {
  heading: string;
  body: string;
  updatedLabel: string;
};

/**
 * The live, owner-editable strip. Renders the seed/build-time value instantly,
 * then (hydrated `client:visible`) reads the current row from the TodaysCatch
 * collection as it scrolls into view — so an edit in the CMS shows up without a
 * redeploy. Carries the ember-glow edge to mark it as the daily element.
 */
export default function TodaysCatchBanner({ heading, body, updatedLabel }: Props) {
  const [state, setState] = useState({ heading, body, updatedLabel });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await items.query('TodaysCatch').find();
        const row: any = res.items?.[0];
        if (alive && row) {
          setState({
            heading: row.heading ?? heading,
            body: row.body ?? body,
            updatedLabel: row.updatedLabel ?? updatedLabel,
          });
        }
      } catch {
        /* keep the seed value */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <aside className="todays-catch" aria-label="Today's catch">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:py-8">
        <div className="flex items-start gap-4">
          <span className="catch-dot" aria-hidden="true" />
          <div>
            <p className="label">{state.heading}</p>
            <p className="catch-body mt-2">{state.body}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 pl-8 sm:pl-0">
          <span className="text-xs uppercase tracking-[0.18em] text-[color-mix(in_oklab,var(--color-on-dark)_60%,transparent)]">
            {state.updatedLabel}
          </span>
          <a href="/menu" className="catch-link">
            See the board
          </a>
        </div>
      </div>
    </aside>
  );
}
