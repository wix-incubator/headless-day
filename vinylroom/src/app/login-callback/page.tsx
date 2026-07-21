"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { completeLogin, LoginCallbackError } from "@/lib/wix/auth";
import VinylDisc from "@/components/VinylDisc";

export default function LoginCallback() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    completeLogin()
      .then((returnTo) => router.replace(returnTo || "/"))
      .catch((err) =>
        setError(
          err instanceof LoginCallbackError
            ? `Wix returned ${err.code}: ${err.message}`
            : "We couldn't finish signing you in.",
        ),
      );
  }, [router]);

  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center gap-6 bg-void px-5 text-center">
      <div className="h-20 w-20">
        <VinylDisc accent="#d89a45" spinning={!error} className="h-full w-full" />
      </div>
      {error ? (
        <>
          <p className="max-w-xl font-display text-2xl text-cream">{error}</p>
          <Link href="/" className="rounded-full border border-edge-strong px-6 py-3 text-sm text-cream clickable">
            Back home
          </Link>
        </>
      ) : (
        <p className="eyebrow">Cueing up your session…</p>
      )}
    </main>
  );
}
