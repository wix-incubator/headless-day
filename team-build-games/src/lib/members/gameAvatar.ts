/**
 * Avatar resolution for a signed-in player in a given game:
 *   explicit per-game disable → per-game override → global profile photo → none.
 *
 * `null` means "no photo" — the renderer keeps the selected fighter's illustrated head.
 */

function firstNonBlank(...urls: (string | null | undefined)[]): string | null {
  for (const u of urls) {
    if (typeof u === "string" && u.trim() !== "") return u;
  }
  return null;
}

export function resolveGameAvatar(
  perGameUrl: string | null | undefined,
  globalUrl: string | null | undefined,
  disabled = false,
): string | null {
  if (disabled) return null;
  return firstNonBlank(perGameUrl, globalUrl);
}
