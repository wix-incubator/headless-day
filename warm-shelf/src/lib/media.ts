import { media } from '@wix/sdk';

export function imgSrc(value: unknown, w = 800, h = 600): string {
	const v: any = (value as any)?.image ?? (value as any)?.url ?? value;
	if (!v) return '';
	if (typeof v === 'string' && v.startsWith('wix:image://')) {
		return media.getScaledToFillImageUrl(v, w, h, {});
	}
	return typeof v === 'string' ? v : (v.url ?? '');
}

export function formatPrice(value?: string | number | null, currency?: string | null): string {
	const n = Number(value);
	if (!Number.isFinite(n)) return '';
	try {
		return new Intl.NumberFormat('en', { style: 'currency', currency: currency || 'EUR' }).format(n);
	} catch {
		return `${n.toFixed(2)} ${currency ?? ''}`.trim();
	}
}
