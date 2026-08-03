import { useEffect, useState } from 'react';
import { bookings } from '@wix/bookings';

export default function BookingStatus() {
	const [state, setState] = useState<'loading' | 'done' | 'pending' | 'unknown'>('loading');
	const [when, setWhen] = useState('');

	useEffect(() => {
		(async () => {
			const token = new URLSearchParams(window.location.search).get('token');
			if (!token) {
				setState('unknown');
				return;
			}
			try {
				const { booking } = (await bookings.bookingsGetBookingAnonymously(token)) as any;
				const start = booking?.bookedEntity?.slot?.startDate;
				if (start) {
					try {
						setWhen(new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(start)));
					} catch {
						setWhen(String(start));
					}
				}
				const status = booking?.status;
				if (status === 'CONFIRMED' || status === 'PENDING') setState('done');
				else if (status === 'CREATED') setState('pending');
				else setState('unknown');
			} catch {
				setState('unknown');
			}
		})();
	}, []);

	if (state === 'loading') return <p style={{ color: 'var(--ink-soft)' }}>Checking your booking…</p>;

	if (state === 'done') {
		return (
			<div className="notice notice-ok">
				<strong>Your session is booked.</strong>
				{when && <> We'll see you on {when}.</>} A confirmation email is on its way.
			</div>
		);
	}

	if (state === 'pending') {
		return (
			<div className="notice notice-err">
				<strong>Your booking is reserved but not confirmed yet</strong> — the payment didn't go through.
				{when && <> The slot ({when}) is held for a short while.</>} You can retry the payment from the
				checkout page, or contact us and we'll finish it at the counter.
			</div>
		);
	}

	return (
		<div className="notice notice-ok">
			If you completed a booking, a confirmation email is on its way. Questions? Ask us at the counter.
		</div>
	);
}
