import { useEffect, useRef, useState } from 'react';

type Slide = { url: string; caption: string; sub?: string };
type Props = {
	slides: Slide[];
	eyebrow: string;
	title: string;
	subtitle: string;
};

export default function HeroSlider({ slides, eyebrow, title, subtitle }: Props) {
	const [active, setActive] = useState(0);
	const [offset, setOffset] = useState(0);
	const timer = useRef<ReturnType<typeof setInterval> | null>(null);

	const start = () => {
		stop();
		timer.current = setInterval(() => setActive((i) => (i + 1) % slides.length), 6000);
	};
	const stop = () => {
		if (timer.current) clearInterval(timer.current);
	};

	useEffect(() => {
		if (slides.length > 1) start();
		return stop;
	}, [slides.length]);

	useEffect(() => {
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduce) return;
		const onScroll = () => {
			const y = window.scrollY;
			if (y < window.innerHeight) setOffset(y * 0.35);
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	const go = (i: number) => {
		setActive(i);
		start();
	};

	return (
		<section className="hero-slider" aria-label="Warm Shelf spaces">
			<div className="hs-stage">
				{slides.map((s, i) => (
					<div key={s.url} className={`hs-slide ${i === active ? 'on' : ''}`} aria-hidden={i !== active}>
						<img src={s.url} alt={s.caption} loading={i === 0 ? 'eager' : 'lazy'} />
					</div>
				))}
				<div className="hs-scrim" />
			</div>

			<div className="hs-fade" aria-hidden="true" />

			<div className="hs-content" style={{ transform: `translateY(${offset}px)`, opacity: Math.max(0, 1 - offset / 260) }}>
				<span className="hs-eyebrow">{eyebrow}</span>
				<h1>{title}</h1>
				<p className="hs-sub">{subtitle}</p>
				<div className="hs-actions">
					<a className="btn btn-accent" href="/books">Browse books</a>
					<a className="btn btn-light" href="/events">What's on</a>
				</div>
			</div>

			<div className="hs-caption">
				<span className="hs-cap-name">{slides[active]?.caption}</span>
				{slides[active]?.sub && <span className="hs-cap-sub">{slides[active].sub}</span>}
			</div>

			{slides.length > 1 && (
				<div className="hs-dots" role="tablist" aria-label="Choose a space">
					{slides.map((s, i) => (
						<button
							key={s.url}
							className={i === active ? 'on' : ''}
							aria-label={`Show ${s.caption}`}
							aria-selected={i === active}
							role="tab"
							onClick={() => go(i)}
						/>
					))}
				</div>
			)}

			<a className="hs-cue" href="#below" aria-label="Scroll down">
				<span />
			</a>

			<style>{`
				.hero-slider {
					position: relative;
					height: 100svh;
					min-height: 560px;
					width: 100%;
					overflow: hidden;
					color: var(--cream);
					display: flex;
					align-items: center;
				}
				.hs-stage { position: absolute; inset: 0; z-index: 0; background: #2b2316; }
				.hs-slide { position: absolute; inset: 0; opacity: 0; transition: opacity 1.4s ease; }
				.hs-slide.on { opacity: 1; }
				.hs-slide img { width: 100%; height: 100%; object-fit: cover; }
				.hs-slide.on img { animation: kenburns 7s ease-out both; }
				@keyframes kenburns {
					from { transform: scale(1.12) translate(2%, 1%); }
					to { transform: scale(1); }
				}
				.hs-scrim {
					position: absolute; inset: 0;
					background:
						linear-gradient(to top, rgba(43,35,22,0.85) 0%, rgba(43,35,22,0.15) 45%, rgba(43,35,22,0.35) 100%),
						linear-gradient(105deg, rgba(43,35,22,0.6) 0%, rgba(43,35,22,0) 60%);
				}
				.hs-fade {
					position: absolute; left: 0; right: 0; bottom: 0; height: 32%;
					z-index: 1; pointer-events: none;
					background: linear-gradient(to bottom, rgba(250,246,238,0) 0%, rgba(250,246,238,0.55) 55%, var(--cream) 100%);
				}
				.hs-content {
					position: relative;
					z-index: 2;
					width: 100%;
					max-width: 1500px;
					margin: 0 auto;
					padding: 0 clamp(1.5rem, 5vw, 5rem);
					will-change: transform;
				}
				.hs-eyebrow {
					display: inline-block;
					font-size: 0.8rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase;
					color: var(--amber-soft); margin-bottom: 1rem;
				}
				.hs-content h1 { color: var(--cream); max-width: 16ch; margin: 0 0 1rem; text-shadow: 0 2px 30px rgba(0,0,0,0.3); }
				.hs-sub { max-width: 46ch; font-size: clamp(1rem, 1.5vw, 1.2rem); color: rgba(250,246,238,0.9); }
				.hs-actions { display: flex; gap: 0.9rem; flex-wrap: wrap; margin-top: 1.8rem; }

				.hs-caption {
					position: absolute; z-index: 2; right: clamp(1.5rem, 5vw, 5rem); bottom: 2.4rem;
					display: flex; flex-direction: column; align-items: flex-end; text-align: right;
					color: var(--ink);
				}
				.hs-cap-name { font-family: var(--font-display); font-size: 1.15rem; }
				.hs-cap-sub { font-size: 0.82rem; color: var(--ink-soft); }

				.hs-dots { position: absolute; z-index: 3; left: clamp(1.5rem, 5vw, 5rem); bottom: 2.4rem; display: flex; gap: 0.6rem; }
				.hs-dots button {
					width: 34px; height: 4px; border-radius: 999px; border: 0; padding: 0; cursor: pointer;
					background: rgba(43,35,22,0.28); transition: background 0.3s ease;
				}
				.hs-dots button.on { background: var(--terracotta); }

				.hs-cue {
					position: absolute; z-index: 3; left: 50%; bottom: 1.4rem; transform: translateX(-50%);
					width: 24px; height: 38px; border: 2px solid rgba(43,35,22,0.4); border-radius: 14px;
					display: flex; justify-content: center;
				}
				.hs-cue span { width: 4px; height: 8px; margin-top: 6px; border-radius: 2px; background: var(--olive-deep); animation: cue 1.6s ease-in-out infinite; }
				@keyframes cue { 0%,100% { opacity: 0; transform: translateY(0); } 50% { opacity: 1; transform: translateY(8px); } }

				@media (max-width: 720px) {
					.hs-caption { display: none; }
				}
				@media (prefers-reduced-motion: reduce) {
					.hs-slide.on img { animation: none; }
					.hs-cue span { animation: none; }
				}
			`}</style>
		</section>
	);
}
