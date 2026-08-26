// joke-exchange — 3D-game-style client. The scene IS the interface; DOM is a thin HUD.
// Accessibility track: sr-only live copies of everything shown in 3D + a low-motion
// mode (auto-on for prefers-reduced-motion) that swaps animations for a readable card.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ackWarning,
  fetchLeaderboard,
  fetchMe,
  flag,
  hasReacted,
  markReacted,
  prefersReducedMotion,
  react as sendReaction,
  submitJoke,
  warningAcked,
  type LeaderboardData,
  type Me,
  type RewardJoke,
} from "./api";
import "./styles.css";

const Scene = lazy(() => import("./Scene"));

type Flow = "gate" | "idle" | "compose" | "submitting" | "rolling" | "revealed";

const MAX_LEN = 600;

export default function App() {
  const [flow, setFlow] = useState<Flow>("idle");
  const [lowMotion, setLowMotion] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  // compose state
  const [text, setText] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // reveal state
  const [reward, setReward] = useState<RewardJoke | null>(null);
  const [notice, setNotice] = useState<string | undefined>();
  const [curtainLifted, setCurtainLifted] = useState(false);
  const [reacted, setReacted] = useState(false);
  const [score, setScore] = useState(0);
  const [launchCount, setLaunchCount] = useState(0);
  const [confettiCount, setConfettiCount] = useState(0);

  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [lbOpen, setLbOpen] = useState(false);
  const [lbPeriod, setLbPeriod] = useState<"week" | "all">("all");
  const lbLoading = useRef(false);

  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const showToast = useCallback((msg: string, error = false) => {
    setToast({ msg, error });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  useEffect(() => {
    setFlow(warningAcked() ? "idle" : "gate");
    setLowMotion(prefersReducedMotion());
    fetchMe().then(setMe).catch(() => {});
  }, []);

  const canSubmit = text.trim().length >= 10 && text.length <= MAX_LEN;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || flow === "submitting") return;
    setFlow("submitting");
    try {
      // avoid-filter UI is hidden until AI classification can be trusted — send none
      const result = await submitJoke({
        text: text.trim(),
        avoidCategories: [],
        avoidFlags: [],
      });
      setText("");
      setLaunchCount((c) => c + 1);
      setReward(result.joke);
      setNotice(result.notice);
      setCurtainLifted(false);
      setReacted(result.joke ? hasReacted(result.joke.id) : true);
      setScore(result.joke?.score ?? 0);
      if (!result.joke) {
        setFlow("idle");
        showToast(result.notice ?? "Joke received!");
      } else {
        setFlow(lowMotion ? "revealed" : "rolling");
      }
    } catch (err: any) {
      setFlow("compose");
      showToast(err.message ?? "Something went wrong.", true);
    }
  };

  const onDiceSettled = useCallback(() => setFlow("revealed"), []);

  const onReact = async () => {
    if (!reward || reacted) return;
    setReacted(true);
    if (!lowMotion) setConfettiCount((c) => c + 1);
    try {
      const r = await sendReaction(reward.id, "laugh");
      markReacted(reward.id);
      setScore(r.score);
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const onFlag = async (reason: string) => {
    if (!reward) return;
    try {
      const r = await flag(reward.id, reason);
      showToast(r.hidden ? "Flagged — this joke has been hidden." : "Flagged. Thanks for keeping the stage clean.");
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const openLeaderboard = async (period: "week" | "all" = lbPeriod) => {
    setLbOpen(true);
    setLbPeriod(period);
    setLeaderboard(null);
    lbLoading.current = true;
    try {
      setLeaderboard(await fetchLeaderboard(period, 0));
    } catch (err: any) {
      showToast(err.message, true);
    } finally {
      lbLoading.current = false;
    }
  };

  // infinite scroll: append the next page when the dialog nears its bottom
  const onLbScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!leaderboard?.hasMore || lbLoading.current) return;
    if (el.scrollTop + el.clientHeight < el.scrollHeight - 160) return;
    lbLoading.current = true;
    try {
      const next = await fetchLeaderboard(lbPeriod, leaderboard.topJokes.length);
      setLeaderboard((cur) =>
        cur ? { ...next, topJokes: [...cur.topJokes, ...next.topJokes], topComedians: cur.topComedians } : next,
      );
    } catch (err: any) {
      showToast(err.message, true);
    } finally {
      lbLoading.current = false;
    }
  };

  const curtained = (reward?.contentFlags?.length ?? 0) > 0 && !curtainLifted;
  const jokeDisplay = useMemo(
    () =>
      reward
        ? {
            text: reward.text,
            category: reward.category,
            authorHandle: reward.authorHandle,
            curtained,
          }
        : null,
    [reward, curtained],
  );

  return (
    <div className="jx-root">
      <div className="jx-canvas-wrap">
        <Suspense fallback={<div className="jx-loading">setting the stage…</div>}>
          <Scene
            phase={flow === "rolling" ? "rolling" : flow === "revealed" ? "revealed" : "idle"}
            onDiceSettled={onDiceSettled}
            launchCount={launchCount}
            confettiCount={confettiCount}
            lowMotion={lowMotion}
            joke={jokeDisplay}
          />
        </Suspense>
      </div>

      {/* ── HUD ── */}
      <div className="jx-hud">
        <header className="jx-hud-top">
          <span className="jx-wordmark">
            joke<span className="tick">·</span>exchange
          </span>
          <nav className="jx-hud-icons" aria-label="Menu">
            <button className="jx-hud-btn" onClick={() => openLeaderboard()} title="Leaderboard">
              🏆<span className="jx-hud-label">Ranks</span>
            </button>
            <button
              className="jx-hud-btn"
              onClick={() => setSettingsOpen((v) => !v)}
              title="Settings"
              aria-expanded={settingsOpen}
            >
              ⚙<span className="jx-hud-label">Tune</span>
            </button>
            {me ? (
              <details className="jx-flagmenu jx-usermenu">
                <summary className="jx-hud-btn" title="Account">
                  👤<span className="jx-hud-label">{me.handle}</span>
                </summary>
                <div className="jx-flagmenu-pop jx-dialog-pop">
                  {/* logout is a POST to the built-in @wix/astro route */}
                  <form method="POST" action="/api/auth/logout?returnUrl=/">
                    <button className="jx-btn jx-btn--small" type="submit">
                      Log out
                    </button>
                  </form>
                </div>
              </details>
            ) : (
              <a className="jx-hud-btn" href="/api/auth/login?returnUrl=/" title="Log in to claim your rank">
                👤<span className="jx-hud-label">Log in</span>
              </a>
            )}
          </nav>
        </header>

        {settingsOpen && (
          <aside className="jx-settings jx-dialog-pop" aria-label="Settings">
            {/* content-flag filters hidden until AI classification can be trusted (heuristics misclassify) */}
            <h3 className="jx-mini-title">ACCESSIBILITY</h3>
            <button className="jx-chip" aria-pressed={lowMotion} onClick={() => setLowMotion((v) => !v)}>
              {lowMotion ? "✓ calm mode (no animation)" : "calm mode (no animation)"}
            </button>
            <button className="jx-btn jx-btn--small" style={{ marginTop: 10 }} onClick={() => setSettingsOpen(false)}>
              Done
            </button>
          </aside>
        )}

        {/* ── stage-state UI ── */}
        {flow === "gate" && (
          <div className="jx-splash">
            <div className="jx-splash-inner jx-dialog-pop">
              <p className="jx-splash-warning">
                UNCENSORED STAGE — jokes are visitor-written; dark or edgy material may appear behind warnings.
              </p>
              <button
                className="jx-cta"
                onClick={() => {
                  ackWarning();
                  setFlow("idle");
                }}
              >
                ▶ ENTER
              </button>
            </div>
          </div>
        )}

        {flow === "idle" && (
          <div className="jx-bottom-center">
            <button className="jx-cta jx-cta--pulse" onClick={() => setFlow("compose")}>
              🎤 TAKE THE STAGE
            </button>
            <p className="jx-hint">give one to get one</p>
          </div>
        )}

        {(flow === "compose" || flow === "submitting") && (
          <div className="jx-modal-scrim" onClick={() => flow === "compose" && setFlow("idle")}>
            <form className="jx-dialog jx-dialog-pop" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
              <label className="jx-mini-title" htmlFor="jx-text">YOUR JOKE</label>
              <textarea
                id="jx-text"
                rows={3}
                value={text}
                maxLength={MAX_LEN + 50}
                onChange={(e) => setText(e.target.value)}
                placeholder="A guy walks into a bar…"
                disabled={flow === "submitting"}
                autoFocus
              />
              <div className="jx-row">
                <span className="jx-hint" style={{ letterSpacing: "0.08em" }}>category &amp; warnings are detected for you</span>
                <span className={`jx-charcount${text.length > MAX_LEN ? " over" : ""}`}>{text.length}/{MAX_LEN}</span>
              </div>
              <div className="jx-row">
                <button type="button" className="jx-btn jx-btn--small jx-btn--ghost" onClick={() => setFlow("idle")} disabled={flow === "submitting"}>
                  ← back
                </button>
                <button className="jx-cta jx-cta--compact" type="submit" disabled={!canSubmit || flow === "submitting"} style={{ marginLeft: "auto" }}>
                  {flow === "submitting" ? "…" : "ROLL THE DICE 🎲"}
                </button>
              </div>
            </form>
          </div>
        )}

        {flow === "rolling" && (
          <div className="jx-bottom-center">
            <p className="jx-rolling" aria-live="polite">THE DICE DECIDE YOUR FATE…</p>
          </div>
        )}

        {flow === "revealed" && reward && (
          <div className="jx-bottom-center jx-actionbar-wrap">
            {/* accessibility: the joke text lives in the DOM even though it renders in 3D */}
            <p className="jx-sr-only" aria-live="polite">
              {curtained
                ? `Joke withheld behind a content warning: tagged ${reward.contentFlags.join(", ")}.`
                : `${reward.text} — by ${reward.authorHandle}`}
            </p>
            {lowMotion && !curtained && (
              <div className="jx-calm-card jx-dialog-pop">
                <p>{reward.text}</p>
                <small>— {reward.authorHandle}</small>
              </div>
            )}
            {notice && <p className="jx-hint">{notice}</p>}
            <div className="jx-actionbar jx-dialog-pop">
              {curtained ? (
                <button className="jx-cta jx-cta--compact" onClick={() => setCurtainLifted(true)}>
                  ⚠ REVEAL — I WAS WARNED
                </button>
              ) : (
                <>
                  <button className="jx-react" onClick={onReact} disabled={reacted} aria-label="React: hilarious">😂</button>
                  <span className="jx-score" aria-live="polite">★ {score}</span>
                  <details className="jx-flagmenu">
                    <summary className="jx-hud-btn" aria-label="Flag this joke">🚩</summary>
                    <div className="jx-flagmenu-pop jx-dialog-pop">
                      {["offensive", "not-a-joke", "duplicate", "spam"].map((r) => (
                        <button key={r} className="jx-btn jx-btn--small jx-btn--ghost" onClick={() => onFlag(r)}>{r}</button>
                      ))}
                    </div>
                  </details>
                </>
              )}
              <button className="jx-cta jx-cta--compact" onClick={() => setFlow("compose")}>
                🎤 AGAIN
              </button>
            </div>
          </div>
        )}

        <footer className="jx-footer">user-submitted humor · flag what crosses the line · be kind, comedy is hard</footer>
      </div>

      {/* ── leaderboard ── */}
      {lbOpen && (
        <div className="jx-modal-scrim" onClick={() => setLbOpen(false)} role="dialog" aria-modal="true" aria-label="Leaderboard">
          <div className="jx-dialog jx-dialog--wide jx-dialog-pop" onClick={(e) => e.stopPropagation()} onScroll={onLbScroll}>
            <div className="jx-row">
              <h2 className="jx-lb-title">🏆 HALL OF FAME</h2>
              <button className="jx-btn jx-btn--small jx-btn--ghost" style={{ marginLeft: "auto" }} onClick={() => setLbOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="jx-row">
              <button className="jx-chip" aria-pressed={lbPeriod === "week"} onClick={() => openLeaderboard("week")}>this week</button>
              <button className="jx-chip" aria-pressed={lbPeriod === "all"} onClick={() => openLeaderboard("all")}>all-time</button>
            </div>
            <h3 className="jx-mini-title">TOP COMEDIANS</h3>
            {leaderboard?.topComedians.length ? (
              <>
                <div className="jx-podium" aria-hidden="true">
                  {[1, 0, 2].map((rank) => {
                    const c = leaderboard.topComedians[rank];
                    return (
                      <div key={rank} className={`jx-podium-col jx-podium-col--${rank + 1}`}>
                        <span className="jx-podium-name">{c?.handle ?? "—"}</span>
                        <div className="jx-podium-bar">
                          <span className="jx-podium-medal">{["🥇", "🥈", "🥉"][rank]}</span>
                          <span className="jx-podium-score">{c ? `★ ${c.score}` : ""}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {leaderboard.topComedians.slice(3).map((c, i) => (
                  <div className="jx-lb-row" key={c.handle}>
                    <span className="jx-lb-rank">{i + 4}</span>
                    <div className="jx-lb-text">
                      {c.handle}
                      <div className="jx-lb-sub">★ {c.score} across {c.jokes} joke{c.jokes === 1 ? "" : "s"}</div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p className="jx-lb-sub">
                Nobody is on the board yet.{" "}
                {me ? "Your next joke counts!" : <a href="/api/auth/login?returnUrl=/" style={{ color: "var(--gold-bright)" }}>Log in</a>}
                {!me && " to claim your spot."}
              </p>
            )}
            <h3 className="jx-mini-title">TOP JOKES</h3>
            {leaderboard?.topJokes.length ? (
              leaderboard.topJokes.map((j, i) => (
                <div className={`jx-lb-row${i < 3 ? " jx-lb-row--medal" : ""}`} key={j.id}>
                  <span className="jx-lb-rank">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                  <div className="jx-lb-text">
                    {j.contentFlags.length > 0 ? <em className="jx-lb-hidden">[{j.contentFlags.join(", ")} — hidden in list]</em> : j.text}
                    <div className="jx-lb-sub">{j.category} · {j.authorHandle} · ★ {j.score}</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="jx-lb-sub">
                No ranked jokes{lbPeriod === "week" ? " this week" : ""} yet — only jokes by logged-in comedians rank here.
              </p>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className={`jx-toast${toast.error ? " jx-toast--error" : ""}`} role="status">
          {toast.msg}
        </div>
      )}
    </div>
  );
}
