import { useEffect, useState } from 'react';
import { readOnlyVariantsV3 } from '@wix/stores';
import { currentCart } from '@wix/ecom';

const STORES_APP_ID = '215238eb-22a5-4c36-9e7b-e7c08025e04e';

type Props = { productId: string; productName: string };

export default function AddToCart({ productId }: Props) {
	const [variants, setVariants] = useState<any[]>([]);
	const [variantId, setVariantId] = useState('');
	const [qty, setQty] = useState(1);
	const [state, setState] = useState<'loading' | 'idle' | 'adding' | 'added' | 'error'>('loading');
	const [error, setError] = useState('');

	useEffect(() => {
		(async () => {
			try {
				const { items } = await readOnlyVariantsV3
					.queryVariants()
					.eq('productData.productId', productId)
					.find();
				const list = items ?? [];
				setVariants(list);
				const first: any = list[0];
				setVariantId(first?.variantId ?? first?._id ?? '');
				setState('idle');
			} catch {
				setState('error');
				setError('Could not load purchase options — please refresh.');
			}
		})();
	}, [productId]);

	const options = variants.map((v: any) => ({
		id: v.variantId ?? v._id,
		label:
			(v.optionChoices ?? [])
				.map((c: any) => c.optionChoiceNames?.choiceName)
				.filter(Boolean)
				.join(' / ') || 'Standard',
		inStock: v.inventoryStatus?.inStock !== false,
	}));

	async function add() {
		if (!variantId || state === 'adding') return;
		setState('adding');
		setError('');
		try {
			await currentCart.addToCurrentCart({
				lineItems: [
					{
						quantity: qty,
						catalogReference: {
							catalogItemId: productId,
							appId: STORES_APP_ID,
							options: { variantId },
						},
					},
				],
			});
			setState('added');
		} catch {
			setState('error');
			setError('Could not add to cart — please try again.');
		}
	}

	if (state === 'loading') return <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>;

	return (
		<div>
			{options.length > 1 && (
				<div className="field" style={{ maxWidth: 240 }}>
					<label htmlFor="format">Format</label>
					<select id="format" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
						{options.map((o) => (
							<option key={o.id} value={o.id} disabled={!o.inStock}>
								{o.label}
								{o.inStock ? '' : ' (out of stock)'}
							</option>
						))}
					</select>
				</div>
			)}
			<div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
					<button className="btn btn-outline" style={{ padding: '0.4rem 0.9rem' }} onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease quantity">−</button>
					<span style={{ minWidth: '2ch', textAlign: 'center', fontWeight: 600 }}>{qty}</span>
					<button className="btn btn-outline" style={{ padding: '0.4rem 0.9rem' }} onClick={() => setQty(qty + 1)} aria-label="Increase quantity">+</button>
				</div>
				<button className="btn btn-accent" onClick={add} disabled={state === 'adding'}>
					{state === 'adding' ? 'Adding…' : 'Add to cart'}
				</button>
			</div>
			{state === 'added' && (
				<p className="notice notice-ok" style={{ marginTop: '1rem' }}>
					Added to your cart. <a href="/cart">Go to cart →</a>
				</p>
			)}
			{error && (
				<p className="notice notice-err" style={{ marginTop: '1rem' }}>{error}</p>
			)}
		</div>
	);
}
