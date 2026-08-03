/**
 * Arcade "insert coin to start" control, shared by every game's warm-up room.
 * A chunky START plate with a coin slot; pressing it drops a coin into the slot
 * over ~1s before the match begins. Only the host can press it, but the drop
 * animation is driven by `inserting` (fed from synced session state) so EVERY
 * player in the room sees the coin go in at the same moment.
 */

export const COIN_INSERT_MS = 1000;

interface CoinSlotProps {
  /** Host presses to insert the coin; ignored when disabled/inserting. */
  onInsert: () => void;
  /** True for non-hosts (and while a coin is already dropping) — not pressable. */
  disabled?: boolean;
  /** Synced flag: the coin-drop animation is playing for everyone in the room. */
  inserting?: boolean;
  /** Small line under the plate, e.g. why it can't start yet or "host inserts the coin". */
  hint?: string;
}

export default function CoinSlot({ onInsert, disabled = false, inserting = false, hint }: CoinSlotProps) {
  const pressable = !disabled && !inserting;
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => pressable && onInsert()}
        aria-disabled={!pressable}
        aria-label={inserting ? "Inserting coin…" : "Insert coin to start"}
        data-inserting={inserting ? "" : undefined}
        className={`coin-slot ${pressable ? "coin-slot-live" : "coin-slot-idle"}`}
      >
        {/* falling coin (only visible mid-insert) */}
        <span className="coin-slot-coin" aria-hidden="true">
          <span className="coin-slot-coin-face">$</span>
        </span>
        {/* the slot on the cabinet plate */}
        <span className="coin-slot-hole" aria-hidden="true" />
        <span className="coin-slot-label">{inserting ? "STARTING" : "START"}</span>
      </button>
      {hint && <span className="font-display text-[7px] leading-relaxed text-neutral-500">{hint}</span>}
    </div>
  );
}
