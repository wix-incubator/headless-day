import { useState } from 'react';
import { rsvpV2 } from '@wix/events';

type Props = { eventId: string; eventTitle: string };

export default function RsvpForm({ eventId, eventTitle }: Props) {
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
	const [error, setError] = useState('');

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		if (state === 'sending') return;
		setState('sending');
		setError('');
		try {
			await rsvpV2.createRsvp({
				eventId,
				firstName,
				lastName,
				email,
				status: 'YES',
			} as any);
			setState('done');
		} catch (err: any) {
			setState('error');
			const msg = String(err?.message ?? '');
			if (/duplicate|already/i.test(msg)) {
				setError('Looks like this email is already on the guest list — see you there!');
			} else if (/closed|ended|capacity|full/i.test(msg)) {
				setError('Registration for this event is closed.');
			} else {
				setError('Could not send your RSVP — please try again in a moment.');
			}
		}
	}

	if (state === 'done') {
		return (
			<div className="notice notice-ok">
				You're in! We've saved you a seat at “{eventTitle}”. See you at Warm Shelf.
			</div>
		);
	}

	return (
		<form onSubmit={submit}>
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
				<div className="field">
					<label htmlFor="rsvp-first">First name *</label>
					<input id="rsvp-first" required value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
				</div>
				<div className="field">
					<label htmlFor="rsvp-last">Last name *</label>
					<input id="rsvp-last" required value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
				</div>
			</div>
			<div className="field">
				<label htmlFor="rsvp-email">Email *</label>
				<input id="rsvp-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
			</div>
			<button className="btn btn-accent" type="submit" disabled={state === 'sending'}>
				{state === 'sending' ? 'Sending…' : 'RSVP — save my seat'}
			</button>
			{error && <p className="notice notice-err" style={{ marginTop: '1rem' }}>{error}</p>}
		</form>
	);
}
