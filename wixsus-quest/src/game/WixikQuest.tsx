import { useEffect, useMemo, useRef, useState } from 'react';
import type { DesignTokens, SitePart } from './design';
import { PART_ORDER } from './design';
import { type Lang, RTL_LANGS, UI, t } from './i18n';
import { BG_WORLD, VIXIK_HERO, VIXIK_VICTORY } from './quest';
import type { Level, QuestOption, Question } from './quest';
import SitePreview from './SitePreview';
import { playSwordHit, playLaugh, startMusic, stopMusic } from './sfx';

interface Props {
  levels: Level[];
  questions: Question[];
  source: 'cms' | 'fallback';
}

type Phase = 'lang' | 'start' | 'level-intro' | 'question' | 'boss-intro' | 'boss' | 'boss-win' | 'finale';

const STORAGE_KEY = 'wixik-quest-v2';
const CUSTOM_OPTION: QuestOption = { id: 'custom', label: '', isCustom: true };
const HERO_NAME = 'Wixsus';

const STEP_ICONS: Record<string, string> = {
  palette: '🎨',
  typography: '🔤',
  imagery: '🖼️',
  services: '🧩',
  features: '⚡',
};

const EMBERS = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 4.37 + 3) % 100}%`,
  delay: `${(i % 11) * 1.2}s`,
  dur: `${10 + (i % 7) * 2.1}s`,
  size: `${2 + (i % 4)}px`,
  drift: `${((i % 5) - 2) * 18}px`,
}));

interface Saved {
  phase: Phase;
  levelIdx: number;
  qIdx: number;
  bossStep: number;
  tokens: DesignTokens;
  parts: SitePart[];
  score: number;
  correct: number;
  totalGraded: number;
  answers: Record<string, string>;
  lang: Lang;
}

function lvlText(level: Level, lang: Lang) {
  if (lang === 'uk') return { title: level.title, intro: level.intro, bossName: level.bossName, bossIntro: level.bossIntro };
  const tr = level.translations?.[lang];
  return {
    title: tr?.title ?? level.title,
    intro: tr?.intro ?? level.intro,
    bossName: tr?.bossName ?? level.bossName,
    bossIntro: tr?.bossIntro ?? level.bossIntro,
  };
}

function qText(q: Question, lang: Lang): { question: string; explain?: string } {
  if (lang === 'uk') return { question: q.question, explain: q.explain };
  const tr = q.translations?.[lang];
  return { question: tr?.question ?? q.question, explain: tr?.explain ?? q.explain };
}

function optLabel(o: QuestOption, lang: Lang): string {
  if (lang === 'uk') return o.label;
  return o.translations?.[lang] ?? o.label;
}

function partName(part: string, lang: Lang): string {
  return UI[lang].partNames[part] ?? part;
}

export default function WixikQuest({ levels, questions, source }: Props) {
  const byLevel = useMemo(() => {
    return levels.map((lvl) => {
      const all = questions.filter((q) => q.levelSlug === lvl.slug).sort((a, b) => a.order - b.order);
      const regular = all.filter((q) => q.kind !== 'boss').map((q) => ({ ...q, options: [...q.options, CUSTOM_OPTION] }));
      const boss = all.filter((q) => q.kind === 'boss').map((q) => ({ ...q, options: [...q.options, CUSTOM_OPTION] }));
      return { level: lvl, regular, boss };
    });
  }, [levels, questions]);

  const [phase, setPhase] = useState<Phase>('lang');
  const [levelIdx, setLevelIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [bossStep, setBossStep] = useState(0);
  const [tokens, setTokens] = useState<DesignTokens>({});
  const [parts, setParts] = useState<SitePart[]>([]);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [totalGraded, setTotalGraded] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [lang, setLang] = useState<Lang>('uk');

  const [picked, setPicked] = useState<QuestOption | null>(null);
  const [bossHurt, setBossHurt] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const dodgeRef = useRef(0);
  const hoverSpent = useRef(false);
  const tauntAt = useRef(0);
  const [dodgePos, setDodgePos] = useState<{ left: number; top: number } | null>(null);
  const [taunt, setTaunt] = useState(false);

  useEffect(() => {
    const root = document.getElementById('wq-root-el');
    if (!root) return;
    const handler = (e: MouseEvent) => {
      const px = ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3);
      const py = ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3);
      root.style.setProperty('--px', px);
      root.style.setProperty('--py', py);
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  useEffect(() => {
    document.documentElement.dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => { setDodgePos(null); setTaunt(false); hoverSpent.current = false; }, [phase, qIdx, bossStep]);
  useEffect(() => {
    if (picked) { setTaunt(false); setDodgePos(null); hoverSpent.current = false; }
  }, [picked]);
  useEffect(() => {
    if (!taunt) return;
    const onDoc = () => {
      if (Date.now() - tauntAt.current < 400) return;
      setTaunt(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [taunt]);

  function dodgeOrPass() {
    dodgeRef.current += 1;
    if (dodgeRef.current % 3 !== 0) return;
    playLaugh();
    const bw = 240, bh = 64, mx = 24, topMin = 70;
    const botMax = Math.max(topMin + 1, window.innerHeight - bh - 130);
    const preview = document.querySelector('.wq-preview-float')?.getBoundingClientRect();
    let left = mx, top = topMin;
    for (let i = 0; i < 20; i++) {
      left = mx + Math.floor(Math.random() * Math.max(1, window.innerWidth - bw - mx * 2));
      top = topMin + Math.floor(Math.random() * Math.max(1, botMax - topMin));
      const clear = !preview || left + bw < preview.left - 12 || left > preview.right + 12 || top + bh < preview.top - 12 || top > preview.bottom + 12;
      if (clear) break;
    }
    setDodgePos({ left, top });
    tauntAt.current = Date.now();
    setTaunt(true);
  }

  function reportNextHover() {
    if (!hoverSpent.current) {
      hoverSpent.current = true;
      return;
    }
    dodgeOrPass();
  }

  function reportNextPress(e: React.MouseEvent) {
    if (e.button !== 0) return;
    dodgeOrPass();
  }

  const cur = byLevel[levelIdx];

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    setPhase('start'); setLevelIdx(0); setQIdx(0); setBossStep(0);
    setTokens({}); setParts([]); setScore(0); setCorrect(0); setTotalGraded(0); setAnswers({});
    setPicked(null); setSaveState('idle'); setShareUrl(null); setPlayerName('');
  }

  function answerRegular(q: Question, opt: QuestOption) {
    if (picked) return;
    playSwordHit();
    setPicked(opt);
    const label = opt.isCustom ? (opt as any)._typed ?? '' : optLabel(opt, lang);
    setAnswers((a) => ({ ...a, [`${q.levelSlug}-${q.order}`]: label.slice(0, 60) || opt.id }));
    if (!opt.isCustom && q.kind === 'quiz' && q.effectKey && opt.effect) {
      if (q.effectKey === 'wixApps') {
        const apps = (opt.effect as any).apps as string[];
        setTokens((tk) => ({ ...tk, wixApps: apps }));
      } else {
        setTokens((tk) => ({ ...tk, [q.effectKey as string]: opt.effect }));
      }
    }
    if (q.kind === 'logic' && !opt.isCustom) {
      setTotalGraded((n) => n + 1);
      if (opt.correct) { setScore((s) => s + 10); setCorrect((c) => c + 1); }
    } else if (q.kind === 'logic' && opt.isCustom) {
      setTotalGraded((n) => n + 1);
    }
  }

  function nextRegular() {
    setPicked(null);
    if (qIdx + 1 < cur.regular.length) {
      setQIdx(qIdx + 1);
    } else {
      setPhase('boss-intro');
    }
  }

  function answerBoss(q: Question, opt: QuestOption) {
    if (picked) return;
    playSwordHit();
    setPicked(opt);
    const label = opt.isCustom ? (opt as any)._typed ?? '' : optLabel(opt, lang);
    setAnswers((a) => ({ ...a, [`${q.levelSlug}-${q.order}`]: label.slice(0, 60) || opt.id }));
    setTotalGraded((n) => n + 1);
    if (!opt.isCustom && opt.correct) {
      setScore((s) => s + 15);
      setCorrect((c) => c + 1);
      setBossHurt(true);
      setTimeout(() => setBossHurt(false), 650);
    }
  }

  function nextBoss() {
    setPicked(null);
    if (bossStep + 1 < cur.boss.length) {
      setBossStep(bossStep + 1);
    } else {
      const part = cur.level.sitePart as SitePart;
      setParts((p) => (p.includes(part) ? p : [...p, part]));
      setPhase('boss-win');
    }
  }

  function advanceLevel() {
    if (levelIdx + 1 < byLevel.length) {
      setLevelIdx(levelIdx + 1);
      setQIdx(0); setBossStep(0);
      setPhase('level-intro');
    } else {
      setPhase('finale');
    }
  }

  async function saveWorld() {
    setSaveState('saving');
    try {
      const res = await fetch('/api/save-world', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: playerName.trim() || 'Анонімний творець',
          businessType: tokens.business?.type ?? 'unknown',
          designTokens: tokens,
          answers,
          score,
          progress: parts.length,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.id) throw new Error(data.error || 'save failed');
      setShareUrl(`${location.origin}/world/${data.id}`);
      setSaveState('done');
    } catch {
      setSaveState('error');
    }
  }

  const stars = totalGraded > 0 ? Math.max(1, Math.round((correct / totalGraded) * 3)) : 3;
  const txt = cur ? lvlText(cur.level, lang) : null;
  const isLang = phase === 'lang';
  const bossPhase = phase === 'boss-intro' || phase === 'boss';
  const victoryPhase = phase === 'boss-win' || phase === 'finale';
  const portraitSrc = bossPhase ? cur?.level.bossImage : victoryPhase ? VIXIK_VICTORY : VIXIK_HERO;
  const portraitAlt = bossPhase && txt ? txt.bossName : HERO_NAME;
  const dialogueKey = `${phase}-${levelIdx}-${qIdx}-${bossStep}`;

  return (
    <div className="wq-root" id="wq-root-el">
      <div className="wq-bg-image" style={{ backgroundImage: `url(${BG_WORLD})` }} aria-hidden />
      <div className="wq-bg-fog" aria-hidden />
      <div className="wq-bg-layer wq-bg-glow" aria-hidden />
      <div className="wq-bg-rays" aria-hidden />
      <div className="wq-bg-embers" aria-hidden>
        {EMBERS.map((e, i) => (
          <span key={i} style={{ left: e.left, animationDelay: e.delay, animationDuration: e.dur, width: e.size, height: e.size, ['--drift']: e.drift } as any} />
        ))}
      </div>
      <div className="wq-vignette" aria-hidden />

      {!isLang && (
        <div className="wq-topbar">
          <span className="wq-brand">⚔ Wixsus create your site world!</span>
          <span className="wq-spacer" />
          <div className="wq-lang-btns">
            {(['uk', 'en', 'he'] as Lang[]).map((l) => (
              <button key={l} className={`wq-lang-btn${lang === l ? ' active' : ''}`} onClick={() => setLang(l)}>
                {l === 'uk' ? 'УКР' : l === 'en' ? 'ENG' : 'עב'}
              </button>
            ))}
          </div>
          <button
            className="wq-reset"
            onClick={() => { if (musicOn) { stopMusic(); setMusicOn(false); } else { startMusic(); setMusicOn(true); } }}
            title="Music"
            aria-label="Toggle music"
          >
            {musicOn ? '🔊' : '🔇'}
          </button>
          <button
            className="wq-reset"
            onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen();
              else document.documentElement.requestFullscreen().catch(() => {});
            }}
            title="Fullscreen"
            aria-label="Toggle fullscreen"
          >
            ⛶
          </button>
          {phase !== 'start' && (
            <button className="wq-reset" onClick={reset} title={t(lang, 'resetTitle')}>↺</button>
          )}
        </div>
      )}

      {isLang && (
        <div className="wq-lang-stage">
          <LangScreen onPick={(l) => { setLang(l); setPhase('start'); if (musicOn) startMusic(); }} />
        </div>
      )}

      {!isLang && (
        <div className="wq-scene">
          <div className={`wq-portrait ${bossPhase ? 'is-boss' : 'is-hero'}${bossHurt ? ' wq-hit' : ''}`} key={portraitSrc}>
            {portraitSrc && <img className="wq-portrait-img" src={portraitSrc} alt={portraitAlt} />}
          </div>

          {taunt && (
            <div className="wq-taunt" role="status" onClick={() => setTaunt(false)}>
              <p className="wq-taunt-text">
                {lang === 'he'
                  ? 'חשבת שיהיה כזה קל? חחח'
                  : lang === 'en'
                    ? "thought it'd be that easy? haha"
                    : 'а ти думав, все буде так просто? хахаха'}
              </p>
              <span className="wq-taunt-ticks" aria-hidden>✓✓</span>
            </div>
          )}

          <div className="wq-dialogue-wrap">
            <div className="wq-dialogue wq-swap" key={dialogueKey}>
              <i className="wq-dlg-frame" aria-hidden />
              <span className="wq-dlg-tip" aria-hidden />
              {phase === 'start' && (
                <>
                  <div className="wq-speaker">{HERO_NAME}</div>
                  <p className="wq-line">{t(lang, 'startSpeech')}</p>
                  <div className="wq-choices">
                    <ChoiceBtn n={1} onClick={() => setPhase('level-intro')}>{t(lang, 'startBtn')}</ChoiceBtn>
                  </div>
                  <p className="wq-source-note">{source === 'cms' ? t(lang, 'cmsLive') : t(lang, 'cmsFallback')}</p>
                </>
              )}

              {phase === 'level-intro' && txt && (
                <>
                  <div className="wq-speaker">
                    <span className="wq-speaker-tag">{t(lang, 'levelBadge', { n: cur.level.levelNumber, total: byLevel.length })}</span>
                    <span className="wq-speaker-name">{txt.title}</span>
                  </div>
                  <p className="wq-line">{txt.intro}</p>
                  <div className="wq-choices">
                    <ChoiceBtn n={1} onClick={() => { setQIdx(0); setPicked(null); setPhase('question'); }}>{t(lang, 'forward')}</ChoiceBtn>
                  </div>
                </>
              )}

              {phase === 'question' && cur.regular[qIdx] && (
                <QuestionDialogue
                  q={cur.regular[qIdx]}
                  index={qIdx}
                  total={cur.regular.length}
                  picked={picked}
                  lang={lang}
                  dodgePos={dodgePos}
                  onNextHover={reportNextHover}
                  onNextPress={reportNextPress}
                  onPick={(o) => answerRegular(cur.regular[qIdx], o)}
                  onNext={nextRegular}
                />
              )}

              {phase === 'boss-intro' && txt && (
                <>
                  <div className="wq-speaker wq-speaker-danger">
                    <span className="wq-speaker-tag danger">{t(lang, 'bossLabel')}</span>
                    <span className="wq-speaker-name">{txt.bossName}</span>
                  </div>
                  <p className="wq-line">{txt.bossIntro}</p>
                  <div className="wq-choices">
                    <ChoiceBtn n={1} danger onClick={() => { setBossStep(0); setPicked(null); setPhase('boss'); }}>{t(lang, 'toFight')}</ChoiceBtn>
                  </div>
                </>
              )}

              {phase === 'boss' && txt && cur.boss[bossStep] && (
                <BossDialogue
                  bossName={txt.bossName}
                  q={cur.boss[bossStep]}
                  step={bossStep}
                  total={cur.boss.length}
                  picked={picked}
                  lang={lang}
                  dodgePos={dodgePos}
                  onNextHover={reportNextHover}
                  onNextPress={reportNextPress}
                  onPick={(o) => answerBoss(cur.boss[bossStep], o)}
                  onNext={nextBoss}
                />
              )}

              {phase === 'boss-win' && txt && (
                <>
                  <div className="wq-speaker">{HERO_NAME}</div>
                  <p className="wq-line">{t(lang, 'bossDefeated', { bossName: txt.bossName, partName: partName(cur.level.sitePart, lang) })}</p>
                  <div className="wq-choices">
                    <ChoiceBtn n={1} onClick={advanceLevel}>
                      {levelIdx + 1 < byLevel.length ? t(lang, 'nextLevel') : t(lang, 'toFinale')}
                    </ChoiceBtn>
                  </div>
                </>
              )}

              {phase === 'finale' && (
                <FinaleDialogue
                  stars={stars}
                  score={score}
                  correct={correct}
                  totalGraded={totalGraded}
                  tokens={tokens}
                  lang={lang}
                  playerName={playerName}
                  setPlayerName={setPlayerName}
                  saveState={saveState}
                  shareUrl={shareUrl}
                  onSave={saveWorld}
                  onReset={reset}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {!isLang && (
        <aside className={`wq-preview-float${previewOpen ? '' : ' collapsed'}`}>
          <div className="wq-preview-head">
            <span className="wq-preview-title">{t(lang, 'sitePreviewHead')}</span>
            <button
              className="wq-preview-toggle"
              onClick={() => setPreviewOpen((o) => !o)}
              aria-label="toggle preview"
            >
              {previewOpen ? '▾' : '▸'}
            </button>
          </div>
          {previewOpen && (
            <div className="wq-preview-scroll">
              <SitePreview tokens={tokens} parts={parts} lang={lang} />
            </div>
          )}
        </aside>
      )}

      {!isLang && (
        <Stepper levels={levels} levelIdx={levelIdx} parts={parts} lang={lang} />
      )}
    </div>
  );
}

function ChoiceBtn({ n, children, onClick, disabled, state, danger }: {
  n: number; children: React.ReactNode; onClick?: () => void; disabled?: boolean; state?: string; danger?: boolean;
}) {
  return (
    <button className={`wq-choice${danger ? ' danger' : ''}${state ? ' ' + state : ''}`} disabled={disabled} onClick={onClick}>
      <span className="wq-choice-mark">►</span>
      <span className="wq-choice-num">{n}.</span>
      <span className="wq-choice-text">{children}</span>
      {state === 'correct' && <span className="wq-choice-badge">✓</span>}
      {state === 'wrong' && <span className="wq-choice-badge">✕</span>}
    </button>
  );
}

function LangScreen({ onPick }: { onPick: (l: Lang) => void }) {
  return (
    <div className="wq-frame wq-langscreen wq-swap">
      <img className="wq-lang-hero" src={VIXIK_HERO} alt="Wixsus" />
      <h2 className="wq-lang-title">
        Обери мову <span>·</span> Choose language <span>·</span> בחר שפה
      </h2>
      <div className="wq-lang-choices">
        <button className="wq-btn wq-btn-primary" onClick={() => onPick('uk')}>🇺🇦 Українська</button>
        <button className="wq-btn wq-btn-primary" onClick={() => onPick('en')}>🇬🇧 English</button>
        <button className="wq-btn wq-btn-primary" onClick={() => onPick('he')}>🇮🇱 עברית</button>
      </div>
      <p style={{ fontSize: 11, opacity: 0.45, marginTop: 14, fontFamily: 'var(--g-mono)' }}>
        ♪ Sword SFX — Gravity Sound (CC BY 4.0)
      </p>
    </div>
  );
}

function Stepper({ levels, levelIdx, parts, lang }: {
  levels: Level[]; levelIdx: number; parts: SitePart[]; lang: Lang;
}) {
  const fill = levels.length > 0 ? (parts.length / levels.length) * 100 : 0;
  return (
    <div className="wq-stepper">
      <div className="wq-stepper-inner">
        <svg className="wq-stepper-curve" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
          <path className="wq-curve-track" d="M1,12 C16,3 34,3 50,12 S84,21 99,12" />
          <path className="wq-curve-flow" d="M1,12 C16,3 34,3 50,12 S84,21 99,12" pathLength={100} />
          <path className="wq-curve-fill" d="M1,12 C16,3 34,3 50,12 S84,21 99,12" pathLength={100} strokeDasharray="100" strokeDashoffset={100 - fill} />
        </svg>
        {levels.map((lvl, i) => {
          const done = parts.includes(lvl.sitePart as SitePart);
          const active = i === levelIdx && !done;
          const state = done ? 'done' : active ? 'active' : 'upcoming';
          const title = lvlText(lvl, lang).title;
          return (
            <div key={lvl.slug} className={`wq-step ${state}`} title={title}>
              <div className="wq-step-tile">{done ? '✓' : (STEP_ICONS[lvl.slug] ?? '⭐')}</div>
              <span className="wq-step-label">{title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestionDialogue({ q, index, total, picked, lang, dodgePos, onNextHover, onNextPress, onPick, onNext }: {
  q: Question; index: number; total: number; picked: QuestOption | null;
  lang: Lang; dodgePos: { left: number; top: number } | null;
  onNextHover: () => void; onNextPress: (e: React.MouseEvent) => void;
  onPick: (o: QuestOption) => void; onNext: () => void;
}) {
  const [customText, setCustomText] = useState('');
  const isLogic = q.kind === 'logic';
  const { question, explain } = qText(q, lang);

  function pickCustom() {
    if (!customText.trim()) return;
    const opt: QuestOption = { id: 'custom', label: customText.trim(), isCustom: true, _typed: customText.trim() } as any;
    onPick(opt);
  }

  return (
    <>
      <div className="wq-dlg-meta">
        <span className={`wq-chip ${isLogic ? 'wq-chip-logic' : 'wq-chip-quiz'}`}>
          {isLogic ? t(lang, 'logicChip') : t(lang, 'quizChip')}
        </span>
        <span className="wq-qcount">{t(lang, 'questionOf', { n: index + 1, total })}</span>
      </div>
      <div className="wq-speaker">{HERO_NAME}</div>
      <p className="wq-line">{question}</p>
      <div className="wq-choices">
        {q.options.map((o, i) => {
          if (o.isCustom) {
            const isPickedCustom = picked?.isCustom;
            return (
              <div key="custom" className={`wq-choice custom${isPickedCustom ? ' chosen' : ''}`}>
                <span className="wq-choice-mark">►</span>
                <span className="wq-choice-num">{i + 1}.</span>
                <input
                  className="wq-custom-input"
                  type="text"
                  placeholder={UI[lang].customPlaceholder}
                  value={customText}
                  maxLength={60}
                  disabled={!!picked}
                  onChange={(e) => setCustomText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') pickCustom(); }}
                />
              </div>
            );
          }
          const state = optState(q, o, picked);
          return (
            <button key={o.id} className={`wq-choice ${state}`} disabled={!!picked} onClick={() => onPick(o)}>
              <span className="wq-choice-mark">►</span>
              <span className="wq-choice-num">{i + 1}.</span>
              {o.effect && 'accent' in (o.effect as Record<string, unknown>) && (
                <span className="wq-swatch" style={{ background: (o.effect as any).accent }} />
              )}
              <span className="wq-choice-text">{optLabel(o, lang)}</span>
              {state === 'correct' && <span className="wq-choice-badge">✓</span>}
              {state === 'wrong' && <span className="wq-choice-badge">✕</span>}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="wq-dlg-feedback wq-fade-flat">
          {isLogic && (
            <p className={(!picked.isCustom && picked.correct) ? 'wq-good' : 'wq-bad'}>
              {(!picked.isCustom && picked.correct) ? t(lang, 'correctFeedback') : t(lang, 'wrongFeedback')}
            </p>
          )}
          {!isLogic && <p className="wq-good">{t(lang, 'goodChoice')}</p>}
          {explain && <p className="wq-explain">{explain}</p>}
          <button
            className="wq-custom-confirm wq-dodge"
            style={dodgePos ? { position: 'fixed', left: dodgePos.left, top: dodgePos.top, bottom: 'auto', transform: 'none' } : undefined}
            onMouseEnter={onNextHover}
            onMouseDown={onNextPress}
            onClick={onNext}
          >
            {t(lang, 'nextQuestion')}
          </button>
        </div>
      )}
    </>
  );
}

function BossDialogue({ bossName, q, step, total, picked, lang, dodgePos, onNextHover, onNextPress, onPick, onNext }: {
  bossName: string; q: Question; step: number; total: number; picked: QuestOption | null;
  lang: Lang; dodgePos: { left: number; top: number } | null;
  onNextHover: () => void; onNextPress: (e: React.MouseEvent) => void;
  onPick: (o: QuestOption) => void; onNext: () => void;
}) {
  const [customText, setCustomText] = useState('');
  const hpPct = Math.round(((total - step - (picked ? 1 : 0)) / total) * 100);
  const { question, explain } = qText(q, lang);

  function pickCustom() {
    if (!customText.trim()) return;
    const opt: QuestOption = { id: 'custom', label: customText.trim(), isCustom: true, _typed: customText.trim() } as any;
    onPick(opt);
  }

  return (
    <>
      <div className="wq-speaker wq-speaker-danger">
        <span className="wq-speaker-tag danger">{t(lang, 'attackBadge', { n: step + 1, total })}</span>
        <span className="wq-speaker-name">{bossName}</span>
      </div>
      <div className="wq-hp-bar wq-boss-hp-wide"><div className="wq-hp-fill" style={{ width: `${Math.max(hpPct, 0)}%` }} /></div>
      <p className="wq-line">{question}</p>
      <div className="wq-choices">
        {q.options.map((o, i) => {
          if (o.isCustom) {
            const isPickedCustom = picked?.isCustom;
            return (
              <div key="custom" className={`wq-choice custom${isPickedCustom ? ' wrong' : ''}`}>
                <span className="wq-choice-mark">►</span>
                <span className="wq-choice-num">{i + 1}.</span>
                <input
                  className="wq-custom-input"
                  type="text"
                  placeholder={UI[lang].customPlaceholder}
                  value={customText}
                  maxLength={60}
                  disabled={!!picked}
                  onChange={(e) => setCustomText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') pickCustom(); }}
                />
              </div>
            );
          }
          const state = optState(q, o, picked);
          return (
            <button key={o.id} className={`wq-choice ${state}`} disabled={!!picked} onClick={() => onPick(o)}>
              <span className="wq-choice-mark">►</span>
              <span className="wq-choice-num">{i + 1}.</span>
              <span className="wq-choice-text">{optLabel(o, lang)}</span>
              {state === 'correct' && <span className="wq-choice-badge">✓</span>}
              {state === 'wrong' && <span className="wq-choice-badge">✕</span>}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="wq-dlg-feedback wq-fade-flat">
          <p className={(!picked.isCustom && picked.correct) ? 'wq-good' : 'wq-bad'}>
            {(!picked.isCustom && picked.correct) ? t(lang, 'critHit') : t(lang, 'blocked')}
          </p>
          {explain && <p className="wq-explain">{explain}</p>}
          <button
            className="wq-custom-confirm wq-dodge"
            style={dodgePos ? { position: 'fixed', left: dodgePos.left, top: dodgePos.top, bottom: 'auto', transform: 'none' } : undefined}
            onMouseEnter={onNextHover}
            onMouseDown={onNextPress}
            onClick={onNext}
          >
            {step + 1 < total ? t(lang, 'nextAttack') : t(lang, 'finishBoss')}
          </button>
        </div>
      )}
    </>
  );
}

function FinaleDialogue({ stars, score, correct, totalGraded, tokens, lang, playerName, setPlayerName, saveState, shareUrl, onSave, onReset }: {
  stars: number; score: number; correct: number; totalGraded: number; tokens: DesignTokens; lang: Lang;
  playerName: string; setPlayerName: (v: string) => void;
  saveState: 'idle' | 'saving' | 'done' | 'error'; shareUrl: string | null;
  onSave: () => void; onReset: () => void;
}) {
  const speech = lang === 'he'
    ? 'ניצחון. חמישה בוסים מאחוריך, עריצות התבניות נשברה. האתר שלך ניצב, מהפיקסל הראשון ועד האחרון — יחיד במינו, מחושל מההחלטות שלך.'
    : lang === 'en'
    ? 'VICTORY. Five bosses behind you, the tyranny of templates broken. Your site stands, from the first pixel to the last — one of a kind, forged from YOUR choices.'
    : 'ПЕРЕМОГА. Пʼять босів позаду, тиранію шаблонів зламано. Твій сайт постав від першого пікселя до останнього — єдиний у світі, викуваний із ТВОЇХ рішень.';
  return (
    <div className="wq-finale">
      <div className="wq-speaker">{HERO_NAME}</div>
      <p className="wq-line">{speech}</p>
      <div className="wq-stars">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
      <div className="wq-score-row">
        <div><strong>{score}</strong><span>{t(lang, 'scorePoints')}</span></div>
        <div><strong>{correct}/{totalGraded}</strong><span>{t(lang, 'scoreRight')}</span></div>
        <div><strong>{PART_ORDER.length}/{PART_ORDER.length}</strong><span>{t(lang, 'scoreParts')}</span></div>
      </div>

      <div className="wq-style-summary">
        <SummaryChip label={t(lang, 'paletteLabel')} value={tokens.palette?.name} swatch={tokens.palette?.accent} />
        <SummaryChip label={t(lang, 'fontLabel')} value={tokens.fontPair?.name} />
        <SummaryChip label={t(lang, 'businessLabel')} value={tokens.business?.name} />
        <SummaryChip label={t(lang, 'voiceLabel')} value={tokens.tone?.name} />
        <SummaryChip label={t(lang, 'imagesLabel')} value={tokens.imageStyle?.name} />
        <SummaryChip label={t(lang, 'shapeLabel')} value={tokens.radius?.name} />
      </div>

      {saveState !== 'done' && (
        <div className="wq-save-box">
          <input
            className="wq-input"
            placeholder={t(lang, 'savePlaceholder')}
            value={playerName}
            maxLength={40}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <button className="wq-btn wq-btn-primary" disabled={saveState === 'saving'} onClick={onSave}>
            {saveState === 'saving' ? t(lang, 'savingBtn') : t(lang, 'saveBtn')}
          </button>
          {saveState === 'error' && <p className="wq-bad">
            {lang === 'he' ? 'שמירה נכשלה — נסה שוב.' : lang === 'en' ? 'Save failed — try again.' : 'Не вдалося зберегти — спробуй ще раз.'}
          </p>}
        </div>
      )}

      {saveState === 'done' && shareUrl && (
        <div className="wq-save-box wq-fade">
          <p className="wq-good">{t(lang, 'savedOk')}</p>
          <a className="wq-btn wq-btn-primary" href={shareUrl} target="_blank" rel="noreferrer">{t(lang, 'openSite')}</a>
          <code className="wq-share-url">{shareUrl}</code>
        </div>
      )}

      <div className="wq-choices">
        <ChoiceBtn n={1} onClick={onReset}>{t(lang, 'playAgain')}</ChoiceBtn>
      </div>
    </div>
  );
}

function SummaryChip({ label, value, swatch }: { label: string; value?: string; swatch?: string }) {
  if (!value) return null;
  return (
    <div className="wq-sum-chip">
      {swatch && <span className="wq-swatch" style={{ background: swatch }} />}
      <span className="wq-sum-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function optState(q: Question, o: QuestOption, picked: QuestOption | null): string {
  if (!picked) return '';
  if (q.kind === 'quiz') return o.id === picked.id ? 'chosen' : 'dim';
  if (o.correct) return 'correct';
  if (o.id === picked.id) return 'wrong';
  return 'dim';
}
