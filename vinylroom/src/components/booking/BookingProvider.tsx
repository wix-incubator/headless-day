"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type Room } from "@/data/rooms";
import AlbumArt from "@/components/AlbumArt";
import VinylDisc from "@/components/VinylDisc";

type BookingCtx = { open: (room: Room) => void };
const Ctx = createContext<BookingCtx | null>(null);

export function useBooking() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBooking must be used within <BookingProvider>");
  return ctx;
}

type Step = "seats" | "details" | "result";
type Status = "idle" | "loading" | "demo" | "error";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("Wix checkout took too long to respond. Please try again.")), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [step, setStep] = useState<Step>("seats");
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const open = useCallback((r: Room) => {
    setRoom(r);
    setStep("seats");
    setQty(1);
    setName("");
    setEmail("");
    setStatus("idle");
    setMessage("");
  }, []);

  const close = useCallback(() => setRoom(null), []);

  useEffect(() => {
    if (!room) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [room, close]);

  const confirm = useCallback(async () => {
    const validName = name.trim().length >= 2;
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!room || !validName || !validEmail) return;
    setStatus("loading");
    try {
      const { startEventCheckout } = await import("@/lib/wix/booking");
      const res = await withTimeout(startEventCheckout(room, qty), 20000);
      if (res.status === "redirect") {
        window.location.href = res.url; // → Wix-hosted checkout + payment
        return;
      }
      setStep("result");
      setStatus(res.status === "demo" ? "demo" : "error");
      setMessage(res.reason);
    } catch (err) {
      setStep("result");
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong starting checkout.");
    }
  }, [room, qty, name, email]);

  const value = useMemo(() => ({ open }), [open]);
  const maxSeats = room ? Math.min(room.seatsLeft, 8) : 1;

  const nameOk = name.trim().length >= 2;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const detailsValid = nameOk && emailOk;
  const leadRecord = room?.records[0] ?? room?.title ?? "";

  return (
    <Ctx.Provider value={value}>
      {children}
      <AnimatePresence>
        {room && (
          <motion.div
            className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* backdrop */}
            <button
              aria-label="Close"
              onClick={close}
              className="absolute inset-0 bg-void/95 sm:bg-void/80 sm:backdrop-blur-md clickable"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`Reserve ${room.title}`}
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 max-h-[calc(100dvh-0.75rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl border border-edge bg-[#120f0d] shadow-[0_-20px_80px_-20px_rgba(0,0,0,0.9)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl sm:bg-gradient-to-b sm:from-charcoal/95 sm:to-pitch/95 sm:backdrop-blur-2xl"
            >
              <AnimatePresence>
                {status === "loading" && (
                  <motion.div
                    className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-void/88 px-6 text-center backdrop-blur-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="relative h-32 w-40">
                      <motion.div
                        className="absolute right-2 top-5 h-24 w-24"
                        animate={{ x: [0, 10, 18], rotate: [0, 12, 24] }}
                        transition={{ duration: 1.1, repeat: Infinity, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <VinylDisc label={room.genre} accent={room.sleeve.accent} spinning className="h-full w-full" />
                      </motion.div>
                      <motion.div
                        className="absolute left-3 top-3 h-28 w-28 overflow-hidden rounded-xl border border-edge shadow-[0_28px_70px_-34px_rgba(0,0,0,1)]"
                        animate={{ x: [0, -4, 0], rotate: [0, -1.5, 0] }}
                        transition={{ duration: 1.1, repeat: Infinity, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <AlbumArt sleeve={room.sleeve} />
                      </motion.div>
                    </div>
                    <div className="mt-5 text-[0.62rem] uppercase tracking-[0.24em] text-amber">
                      Sending sleeve to Wix checkout
                    </div>
                    <p className="mt-2 max-w-xs text-sm text-parchment">
                      Holding {qty} {qty === 1 ? "seat" : "seats"} for {room.title}.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* header */}
              <div className="flex items-center gap-4 border-b border-edge p-5">
                <div className="relative h-16 w-20 shrink-0">
                  <motion.div
                    layoutId={`room-vinyl-${room.id}`}
                    className="absolute -right-2 top-1 h-14 w-14"
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <VinylDisc label={room.genre} accent={room.sleeve.accent} spinning={false} className="h-full w-full" />
                  </motion.div>
                  <motion.div
                    layoutId={`room-sleeve-${room.id}`}
                    className="absolute left-0 top-0 h-16 w-16 overflow-hidden rounded-lg shadow-[0_18px_40px_-22px_rgba(0,0,0,0.95)]"
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <AlbumArt sleeve={room.sleeve} />
                  </motion.div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[0.6rem] uppercase tracking-[0.2em] text-dust">
                    {room.genre} · {room.city}
                  </div>
                  <h3 className="truncate font-display text-xl leading-tight text-cream">
                    {room.title}
                  </h3>
                  <div className="text-xs text-parchment">
                    {room.dateLabel ?? room.day} · {room.time} · {room.price} / seat
                  </div>
                </div>
                <button
                  onClick={close}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-dust transition-colors hover:text-cream clickable"
                >
                  ✕
                </button>
              </div>

              {/* stepper indicator */}
              {step !== "result" && (
                <div className="flex items-center gap-2 px-5 pt-4">
                  {(["seats", "details"] as const).map((s, i) => (
                    <div key={s} className="flex flex-1 items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[0.65rem] transition-colors ${
                          step === s || (s === "seats" && step === "details")
                            ? "bg-amber text-void"
                            : "border border-edge text-dust"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className={`text-xs ${step === s ? "text-cream" : "text-dust"}`}>
                        {s === "seats" ? "Seats" : "Your details"}
                      </span>
                      {i === 0 && <span className="h-px flex-1 bg-edge" />}
                    </div>
                  ))}
                </div>
              )}

              <div className="p-5">
                {step !== "result" && (
                  <motion.div
                    className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-edge bg-void/35 px-4 py-3"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.08 }}
                  >
                    <div className="min-w-0">
                      <div className="text-[0.58rem] uppercase tracking-[0.18em] text-amber">A-side queued</div>
                      <div className="mt-1 truncate text-sm text-cream">{leadRecord}</div>
                    </div>
                    <div className="rounded-full border border-edge px-3 py-1 text-xs text-parchment">
                      {qty} {qty === 1 ? "seat" : "seats"}
                    </div>
                  </motion.div>
                )}
                <AnimatePresence mode="wait">
                  {/* ── Step 1: seats ── */}
                  {step === "seats" && (
                    <motion.div
                      key="seats"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p className="text-sm text-parchment">
                        How many seats would you like at this listening room?
                      </p>
                      <div className="mt-5 flex items-center justify-between rounded-2xl border border-edge bg-void/40 p-4">
                        <span className="text-sm text-cream">Seats</span>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => setQty((q) => Math.max(1, q - 1))}
                            disabled={qty <= 1}
                            aria-label="Fewer seats"
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-edge-strong text-lg text-cream disabled:opacity-30 clickable"
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-display text-2xl text-cream">{qty}</span>
                          <button
                            onClick={() => setQty((q) => Math.min(maxSeats, q + 1))}
                            disabled={qty >= maxSeats}
                            aria-label="More seats"
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-edge-strong text-lg text-cream disabled:opacity-30 clickable"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 text-center text-[0.7rem] text-amber">
                        {room.seatsLeft} of {room.capacity} seats left
                      </div>

                      <button
                        onClick={() => setStep("details")}
                        className="mt-5 w-full rounded-full py-3.5 text-sm font-medium text-void clickable"
                        style={{
                          background: "linear-gradient(135deg,#e8b45f,#b45f2a)",
                          boxShadow: "0 16px 40px -14px rgba(216,154,69,0.6)",
                        }}
                      >
                        Continue
                      </button>
                    </motion.div>
                  )}

                  {/* ── Step 2: details ── */}
                  {step === "details" && (
                    <motion.div
                      key="details"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="space-y-3">
                        <label className="block">
                          <span className="text-[0.62rem] uppercase tracking-[0.18em] text-dust">Name</span>
                          <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Who's coming?"
                            aria-invalid={!!name && !nameOk}
                            className={`mt-1.5 w-full rounded-xl border bg-void/40 px-4 py-3 text-sm text-cream outline-none transition-colors placeholder:text-dust focus:border-amber/60 ${
                              name && !nameOk ? "border-burnt/70" : "border-edge"
                            }`}
                          />
                          {name && !nameOk && (
                            <span className="mt-1 block text-[0.68rem] text-burnt">Please enter your name.</span>
                          )}
                        </label>
                        <label className="block">
                          <span className="text-[0.62rem] uppercase tracking-[0.18em] text-dust">Email</span>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@email.com"
                            aria-invalid={!!email && !emailOk}
                            className={`mt-1.5 w-full rounded-xl border bg-void/40 px-4 py-3 text-sm text-cream outline-none transition-colors placeholder:text-dust focus:border-amber/60 ${
                              email && !emailOk ? "border-burnt/70" : "border-edge"
                            }`}
                          />
                          {email && !emailOk && (
                            <span className="mt-1 block text-[0.68rem] text-burnt">Enter a valid email address.</span>
                          )}
                        </label>
                      </div>

                      {/* order summary */}
                      <div className="mt-4 space-y-2 rounded-2xl border border-edge bg-void/30 p-4 text-sm">
                        <div className="flex justify-between text-parchment">
                          <span>{qty} × seat</span>
                          <span className="text-cream">{room.price}</span>
                        </div>
                        <div className="flex justify-between border-t border-edge pt-2 text-parchment">
                          <span>Total</span>
                          <span className="font-display text-lg text-cream">
                            {qty} × {room.price}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 flex gap-3">
                        <button
                          onClick={() => setStep("seats")}
                          className="rounded-full border border-edge px-5 py-3.5 text-sm text-cream clickable"
                        >
                          Back
                        </button>
                        <button
                          onClick={confirm}
                          disabled={status === "loading" || !detailsValid}
                          className="flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-sm font-medium text-void transition-opacity disabled:cursor-not-allowed disabled:opacity-40 clickable"
                          style={{
                            background: "linear-gradient(135deg,#e8b45f,#b45f2a)",
                            boxShadow: "0 16px 40px -14px rgba(216,154,69,0.6)",
                          }}
                        >
                          {status === "loading" ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-void/40 border-t-void" />
                              Holding your seats…
                            </>
                          ) : (
                            <>🔒 Secure checkout</>
                          )}
                        </button>
                      </div>
                      <p className="mt-3 text-center text-[0.68rem] text-dust">
                        You&apos;ll confirm and pay securely on Wix. No charge until then.
                      </p>
                    </motion.div>
                  )}

                  {/* ── Result (demo / error) ── */}
                  {step === "result" && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center"
                    >
                      <div
                        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl"
                        style={{
                          background: status === "error" ? "rgba(180,95,42,0.15)" : "rgba(216,154,69,0.15)",
                        }}
                      >
                        {status === "error" ? "!" : "♪"}
                      </div>
                      <h4 className="mt-4 font-display text-2xl text-cream">
                        {status === "error" ? "We hit a snag" : "Checkout ready — demo mode"}
                      </h4>
                      <p className="mx-auto mt-2 max-w-sm text-sm text-parchment">
                        {status === "demo" ? (
                          <>
                            In a live build this hands off to the Wix-hosted checkout to
                            reserve <span className="text-cream">{qty}</span> seat{qty > 1 ? "s" : ""} for{" "}
                            <span className="text-cream">{room.title}</span> and take payment.{" "}
                            {message}
                          </>
                        ) : (
                          message
                        )}
                      </p>
                      <button
                        onClick={close}
                        className="mt-6 rounded-full border border-edge-strong px-6 py-3 text-sm text-cream clickable"
                      >
                        Close
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* trust footer */}
              <div className="flex items-center justify-center gap-2 border-t border-edge py-3 text-[0.62rem] text-dust">
                <span>🔒</span> Secure checkout powered by Wix Events
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
