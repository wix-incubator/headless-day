import { useEffect, useMemo, useState } from 'react';
import { availabilityTimeSlots, bookings } from '@wix/bookings';
import { createCart, calculateCart, placeOrder } from '@wix/auto_sdk_ecom_cart-v-2';
import { redirects } from '@wix/redirects';
import { forms } from '@wix/forms';

const BOOKING_APP_ID = '13d21c63-b5ec-5912-8397-c3a5ddb27a97';
const STAFF_RESOURCE_TYPE_ID = '1cd44cf8-756f-41c3-bd90-3e2ffcaf1155';

const FALLBACK_FIELDS = [
	{ target: 'first_name', label: 'First Name', type: 'STRING' },
	{ target: 'last_name', label: 'Last Name', type: 'STRING' },
	{ target: 'email', label: 'Email', type: 'EMAIL' },
];

type Props = {
	serviceId: string;
	formId?: string;
	paymentOptions?: Record<string, boolean> | null;
	cancellationFeeEnabled?: boolean;
};

function toLocalString(d: Date): string {
	const p = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function inputType(t?: string) {
	if (t === 'EMAIL') return 'email';
	if (t === 'PHONE') return 'tel';
	if (t === 'NUMBER') return 'number';
	return 'text';
}

export default function BookingWidget({ serviceId, formId, paymentOptions, cancellationFeeEnabled }: Props) {
	const [slots, setSlots] = useState<any[]>([]);
	const [slotsState, setSlotsState] = useState<'loading' | 'idle' | 'error'>('loading');
	const [selected, setSelected] = useState<any>(null);
	const [fields, setFields] = useState<any[]>(FALLBACK_FIELDS);
	const [values, setValues] = useState<Record<string, string>>({});
	const [bookState, setBookState] = useState<'idle' | 'booking' | 'error'>('idle');
	const [error, setError] = useState('');

	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	useEffect(() => {
		(async () => {
			try {
				const from = new Date();
				const to = new Date();
				to.setDate(to.getDate() + 14);
				const res = await availabilityTimeSlots.listAvailabilityTimeSlots({
					serviceId,
					fromLocalDate: toLocalString(from),
					toLocalDate: toLocalString(to),
					timeZone,
					bookable: true,
					cursorPaging: { limit: 100 },
				} as any);
				const seen = new Set<string>();
				const unique = (res.timeSlots ?? []).filter((s: any) => {
					if (!s.localStartDate || seen.has(s.localStartDate)) return false;
					seen.add(s.localStartDate);
					return true;
				});
				setSlots(unique);
				setSlotsState('idle');
			} catch {
				setSlotsState('error');
			}
		})();
	}, [serviceId]);

	useEffect(() => {
		if (!formId) return;
		(async () => {
			try {
				const { formSummary } = await forms.getFormSummary(formId);
				const usable = (formSummary?.fields ?? [])
					.filter((f: any) => !f.deleted)
					.filter((f: any) => f.type && ['STRING', 'EMAIL', 'PHONE', 'NUMBER', 'URL'].includes(f.type));
				if (usable.length) setFields(usable);
			} catch {
				/* keep fallback fields */
			}
		})();
	}, [formId]);

	const days = useMemo(() => {
		const byDay = new Map<string, any[]>();
		for (const s of slots) {
			const day = String(s.localStartDate).slice(0, 10);
			if (!byDay.has(day)) byDay.set(day, []);
			byDay.get(day)!.push(s);
		}
		return [...byDay.entries()];
	}, [slots]);

	function dayLabel(day: string) {
		try {
			return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${day}T12:00:00`));
		} catch {
			return day;
		}
	}

	function timeLabel(local: string) {
		return String(local).slice(11, 16);
	}

	async function book(e: React.FormEvent) {
		e.preventDefault();
		if (!selected || bookState === 'booking') return;
		setBookState('booking');
		setError('');
		try {
			const online = paymentOptions?.online;
			const inPerson = paymentOptions?.inPerson;
			const selectedPaymentOption = online && !inPerson ? 'ONLINE' : !online && inPerson ? 'OFFLINE' : 'ONLINE';

			const created = await bookings.createBooking(
				{
					selectedPaymentOption,
					totalParticipants: 1,
					bookedEntity: {
						slot: {
							serviceId,
							scheduleId: selected.scheduleId ?? undefined,
							startDate: selected.localStartDate,
							endDate: selected.localEndDate,
							timezone: timeZone,
							resourceSelections: [
								{ resourceTypeId: STAFF_RESOURCE_TYPE_ID, selectionMethod: 'ANY_RESOURCE' },
							],
							location: { locationType: 'OWNER_BUSINESS' },
						},
					},
				} as any,
				{ formSubmission: values } as any,
			);
			const bookingId = (created as any).booking?._id;
			if (!bookingId) throw new Error('booking failed');

			let token = '';
			try {
				const tokenRes = await bookings.getAnonymousActionToken(bookingId);
				token = (tokenRes as any)?.token ?? '';
			} catch {
				/* confirmation page will show a generic message */
			}

			const cart = await createCart({
				catalogItems: [
					{ quantity: 1, catalogReference: { catalogItemId: bookingId, appId: BOOKING_APP_ID } },
				],
				cart: { source: { channelType: 'WEB' } },
			} as any);
			const cartId = (cart as any)?._id;
			if (!cartId) throw new Error('cart creation failed');

			const { summary } = (await calculateCart(cartId)) as any;
			const total = Number(summary?.priceSummary?.total?.amount ?? 0);

			const origin = window.location.origin;
			const confirmationUrl = `${origin}/booking-confirmation${token ? `?token=${encodeURIComponent(token)}` : ''}`;

			const checkoutRequired =
				Boolean(cancellationFeeEnabled) || (total > 0 && selectedPaymentOption !== 'OFFLINE');

			if (checkoutRequired) {
				const { redirectSession } = await redirects.createRedirectSession({
					ecomCheckout: { checkoutId: cartId },
					callbacks: { postFlowUrl: confirmationUrl },
				});
				window.location.href = redirectSession!.fullUrl!;
			} else {
				await placeOrder(cartId);
				window.location.href = confirmationUrl;
			}
		} catch (err: any) {
			setBookState('error');
			const msg = String(err?.message ?? '');
			if (/payment method|not configured|premium/i.test(msg)) {
				setError("Online payment isn't switched on yet — please book at the counter or call us.");
			} else if (/slot|taken|unavailable/i.test(msg)) {
				setError('That time was just taken — please pick another slot.');
			} else {
				setError('Could not complete the booking — please try again.');
			}
		}
	}

	if (slotsState === 'loading') return <p style={{ color: 'var(--ink-soft)' }}>Checking available times…</p>;
	if (slotsState === 'error') return <p className="notice notice-err">Could not load available times — please refresh the page.</p>;
	if (slots.length === 0) return <p className="notice notice-ok">No open slots in the next two weeks — drop us a visit and we'll find a time.</p>;

	return (
		<form onSubmit={book}>
			<p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>1 · Pick a time</p>
			<div style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
				{days.map(([day, daySlots]) => (
					<div key={day} style={{ marginBottom: '0.8rem' }}>
						<p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)' }}>{dayLabel(day)}</p>
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
							{daySlots.map((s: any) => {
								const active = selected?.localStartDate === s.localStartDate;
								return (
									<button
										key={s.localStartDate}
										type="button"
										onClick={() => setSelected(s)}
										className="chip"
										style={{
											cursor: 'pointer',
											border: '1px solid var(--line)',
											background: active ? 'var(--olive-deep)' : '#fffdf8',
											color: active ? 'var(--cream)' : 'var(--ink)',
											padding: '0.35rem 0.8rem',
											fontSize: '0.85rem',
										}}
									>
										{timeLabel(s.localStartDate)}
									</button>
								);
							})}
						</div>
					</div>
				))}
			</div>

			<p style={{ fontWeight: 600, margin: '1.2rem 0 0.5rem' }}>2 · Your details</p>
			{fields.map((f: any) => (
				<div className="field" key={f.target}>
					<label htmlFor={`bf-${f.target}`}>{f.label ?? f.target}</label>
					{Array.isArray(f.options) && f.options.length ? (
						<select
							id={`bf-${f.target}`}
							value={values[f.target] ?? ''}
							onChange={(e) => setValues({ ...values, [f.target]: e.target.value })}
						>
							<option value="">Choose…</option>
							{f.options.map((o: any) => (
								<option key={String(o?.value ?? o)} value={String(o?.value ?? o)}>{String(o?.label ?? o?.value ?? o)}</option>
							))}
						</select>
					) : (
						<input
							id={`bf-${f.target}`}
							type={inputType(f.type)}
							required={['first_name', 'last_name', 'email'].includes(f.target)}
							value={values[f.target] ?? ''}
							onChange={(e) => setValues({ ...values, [f.target]: e.target.value })}
						/>
					)}
				</div>
			))}

			<button className="btn btn-primary" type="submit" disabled={!selected || bookState === 'booking'} style={{ width: '100%' }}>
				{bookState === 'booking' ? 'Booking…' : selected ? `Book for ${timeLabel(selected.localStartDate)}, ${dayLabel(String(selected.localStartDate).slice(0, 10))}` : 'Pick a time above'}
			</button>
			{error && <p className="notice notice-err" style={{ marginTop: '1rem' }}>{error}</p>}
		</form>
	);
}
