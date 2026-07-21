import { useEffect } from 'react';
import { useAchievements } from '../game/achievements';
import { achievementById } from '../data/achievements';

// Long enough to read a short line, short enough not to nag — the only reveal in the whole
// secret-achievements design (spec §5), so it needs to land, not linger.
const DISMISS_MS = 4000;

/** One badge at a time, top-center so it never fights the bottom controls chip or the
 * right-hand info card. Reduced motion is handled by the existing blanket
 * `@media (prefers-reduced-motion: reduce)` rule in game.css (same as every other
 * `.bb-*` entrance animation) — no separate instant-mode branch needed here. */
export function AchievementToast() {
  const currentId = useAchievements((s) => s.toastQueue[0]);
  const dismissToast = useAchievements((s) => s.dismissToast);

  useEffect(() => {
    if (!currentId) return;
    const id = setTimeout(dismissToast, DISMISS_MS);
    return () => clearTimeout(id);
  }, [currentId, dismissToast]);

  if (!currentId) return null;
  const achievement = achievementById(currentId);
  if (!achievement) return null;

  return (
    <div className="bb-card bb-achievement-toast" role="status" key={achievement.id}>
      {achievement.emoji} Achievement unlocked · {achievement.title}
    </div>
  );
}
