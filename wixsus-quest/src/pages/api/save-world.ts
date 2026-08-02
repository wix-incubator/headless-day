import type { APIRoute } from 'astro';
import { items } from '@wix/data';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const playerName = String(body.playerName ?? 'Анонімний творець').slice(0, 60);
    const businessType = String(body.businessType ?? 'unknown').slice(0, 40);
    const score = Number.isFinite(body.score) ? Number(body.score) : 0;
    const progress = Number.isFinite(body.progress) ? Number(body.progress) : 0;

    const created = await items.insert('player-worlds', {
      playerName,
      businessType,
      designTokens: JSON.stringify(body.designTokens ?? {}),
      answers: JSON.stringify(body.answers ?? {}),
      score,
      progress,
      completed: progress >= 4,
    });

    return new Response(JSON.stringify({ id: created._id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('save-world failed:', err);
    return new Response(JSON.stringify({ error: 'save_failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
