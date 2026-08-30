import type { APIRoute } from 'astro';
import { submissions } from '@wix/forms';

const RESERVATION_FORM_ID = '8ed7eb1f-9ad1-4563-b796-0b966d54ae26';
const FIELDS = ['full_name', 'email', 'phone', 'book_title', 'pickup_date', 'note'] as const;

export const POST: APIRoute = async ({ request, redirect }) => {
	const formData = await request.formData();
	const values: Record<string, string> = {};
	for (const field of FIELDS) {
		const value = formData.get(field);
		if (typeof value === 'string' && value.trim()) values[field] = value.trim();
	}

	const book = values.book_title ?? '';
	try {
		await submissions.createSubmission({
			formId: RESERVATION_FORM_ID,
			submissions: values,
		});
		return redirect(`/reserve?ok=1&book=${encodeURIComponent(book)}`, 303);
	} catch {
		return redirect(`/reserve?error=1&book=${encodeURIComponent(book)}`, 303);
	}
};
