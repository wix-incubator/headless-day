import { useEffect, useState } from 'react';
import { currentCart } from '@wix/ecom';
import { redirects } from '@wix/redirects';
import { imgSrc, formatPrice } from '../lib/media';

export default function CartView() {
	const [cart, setCart] = useState<any>(null);
	const [state, setState] = useState<'loading' | 'idle' | 'checkout' | 'error'>('loading');
	const [error, setError] = useState('');

	async function load() {
		try {
			const c = await currentCart.getCurrentCart();
			setCart(c);
		} catch {
			setCart(null);
		}
		setState('idle');
	}

	useEffect(() => {
		load();
	}, []);

	async function remove(lineItemId: string) {
		try {
			await currentCart.removeLineItemsFromCurrentCart([lineItemId]);
			await load();
		} catch {
			setError('Could not update the cart — please try again.');
		}
	}

	async function checkout() {
		setState('checkout');
		setError('');
		try {
			const checkoutResult = await currentCart.createCheckoutFromCurrentCart({
				channelType: currentCart.ChannelType.WEB,
			});
			const origin = window.location.origin;
			const session = await redirects.createRedirectSession({
				ecomCheckout: { checkoutId: checkoutResult.checkoutId },
				callbacks: { postFlowUrl: `${origin}/cart`, thankYouPageUrl: `${origin}/` },
			});
			window.location.href = session.redirectSession!.fullUrl!;
		} catch {
			setState('idle');
			setError('Checkout could not start — please try again.');
		}
	}

	if (state === 'loading') return <p style={{ color: 'var(--ink-soft)' }}>Loading your cart…</p>;

	const lineItems: any[] = cart?.lineItems ?? [];

	if (lineItems.length === 0) {
		return (
			<div>
				<p style={{ color: 'var(--ink-soft)' }}>Your cart is empty.</p>
				<a className="btn btn-accent" href="/books">Browse books</a>
			</div>
		);
	}

	const currency = cart?.currency;
	const subtotal = lineItems.reduce((sum, li) => sum + Number(li.price?.amount ?? 0) * (li.quantity ?? 1), 0);

	return (
		<div>
			<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
				{lineItems.map((li) => {
					const src = imgSrc(li.image, 160, 220);
					const name = li.productName?.original ?? li.productName?.translated ?? '';
					const desc = (li.descriptionLines ?? [])
						.map((d: any) => d.plainText?.original ?? d.colorInfo?.original)
						.filter(Boolean)
						.join(' · ');
					return (
						<li
							key={li._id}
							style={{
								display: 'flex',
								gap: '1rem',
								alignItems: 'center',
								padding: '1rem 0',
								borderBottom: '1px solid var(--line)',
							}}
						>
							{src ? (
								<img src={src} alt={name} style={{ width: 64, height: 88, objectFit: 'cover', borderRadius: 8 }} />
							) : (
								<div className="themed-block" style={{ width: 64, height: 88, borderRadius: 8, fontSize: 12 }}>📖</div>
							)}
							<div style={{ flex: 1 }}>
								<p style={{ margin: 0, fontWeight: 600 }}>{name}</p>
								{desc && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ink-soft)' }}>{desc}</p>}
								<p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ink-soft)' }}>Qty {li.quantity}</p>
							</div>
							<p style={{ margin: 0, fontWeight: 600 }}>{formatPrice(li.price?.amount, currency)}</p>
							<button
								className="btn btn-outline"
								style={{ padding: '0.35rem 0.9rem', fontSize: '0.85rem' }}
								onClick={() => remove(li._id)}
							>
								Remove
							</button>
						</li>
					);
				})}
			</ul>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
				<p style={{ margin: 0, fontSize: '1.1rem' }}>
					Subtotal: <strong>{formatPrice(subtotal, currency)}</strong>
				</p>
				<button className="btn btn-accent" onClick={checkout} disabled={state === 'checkout'}>
					{state === 'checkout' ? 'Redirecting…' : 'Checkout'}
				</button>
			</div>
			{error && <p className="notice notice-err" style={{ marginTop: '1rem' }}>{error}</p>}
		</div>
	);
}
