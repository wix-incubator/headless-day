"use client";

import { useEffect, useState } from "react";
import { getCurrentMember, login, type Member } from "@/lib/wix/auth";
import { isWixConfigured } from "@/lib/wix/config";

/**
 * Standalone (no context) note for the thank-you page: greets a signed-in
 * member, or nudges guests to sign in so their bookings stick to an account.
 */
export default function MemberBookingNote() {
  const [member, setMember] = useState<Member>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    getCurrentMember()
      .then(setMember)
      .finally(() => setChecked(true));
  }, []);

  if (!isWixConfigured || !checked) return null;

  if (member) {
    return (
      <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-4 py-2 text-sm text-cream">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full bg-amber text-[0.65rem] font-semibold text-void"
        >
          {member.initials}
        </span>
        Saved to your account, {member.name.split(" ")[0]}.
      </p>
    );
  }

  return (
    <button
      onClick={() => login("/thank-you.html")}
      className="mt-5 rounded-full border border-edge-strong px-4 py-2 text-sm text-parchment transition-colors hover:text-cream clickable"
    >
      Sign in to keep your bookings →
    </button>
  );
}
