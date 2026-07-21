"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMember } from "./MemberProvider";

export default function MemberMenu({ variant = "bar" }: { variant?: "bar" | "drawer" }) {
  const { member, loading, demoNotice, login, logout, dismissDemo } = useMember();
  const [open, setOpen] = useState(false);

  if (loading) return null;

  // ── Mobile drawer variant: plain full-width rows ──
  if (variant === "drawer") {
    if (member) {
      return (
        <button
          onClick={logout}
          className="mt-4 flex w-full items-center gap-3 rounded-lg border border-edge px-4 py-3 text-left text-cream transition-colors hover:border-amber/50 clickable"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber text-xs font-semibold text-void">
            {member.initials}
          </span>
          <span className="flex-1">
            <span className="block text-sm">{member.name}</span>
            <span className="block text-xs text-dust">Sign out</span>
          </span>
        </button>
      );
    }
    return (
      <button
        onClick={() => login()}
        className="relative mt-4 flex w-full items-center justify-between rounded-lg border border-edge px-4 py-3 text-left text-sm text-cream transition-colors hover:border-amber/50 clickable"
      >
        <span>Member sign in</span>
        <span className="text-amber" aria-hidden>+</span>
        {demoNotice && (
          <span className="absolute left-0 top-full mt-2 block text-xs text-amber">
            Connect a Wix Client ID to enable accounts.
          </span>
        )}
      </button>
    );
  }

  // ── Desktop bar variant ──
  if (member) {
    return (
      <div className="relative hidden sm:block">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Account"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-edge-strong bg-amber text-xs font-semibold text-void transition-transform hover:scale-105 clickable"
        >
          {member.initials}
        </button>
        <AnimatePresence>
          {open && (
            <>
              <button className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} aria-hidden />
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-2xl border border-edge bg-pitch/95 backdrop-blur-xl glow-warm"
              >
                <div className="border-b border-edge p-4">
                  <div className="text-sm text-cream">{member.name}</div>
                  {member.email && <div className="truncate text-xs text-dust">{member.email}</div>}
                </div>
                <div className="p-2 text-sm">
                  <div className="px-2 py-1.5 text-xs text-dust">Your bookings are saved to this account.</div>
                  <button
                    onClick={logout}
                    className="mt-1 w-full rounded-lg px-2 py-2 text-left text-cream transition-colors hover:bg-charcoal/60 clickable"
                  >
                    Sign out
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative hidden sm:block">
      <button
        onClick={() => login()}
        className="inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-edge-strong px-4 text-sm leading-none text-cream transition-colors hover:border-amber/50 clickable"
      >
        Sign in
      </button>
      <AnimatePresence>
        {demoNotice && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute right-0 top-11 z-20 w-60 rounded-xl border border-amber/30 bg-pitch/95 p-3 text-xs text-parchment backdrop-blur-xl"
          >
            Member accounts need a Wix Headless Client ID. See WIX_SETUP.md.
            <button onClick={dismissDemo} className="mt-2 block text-amber clickable">
              Got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
