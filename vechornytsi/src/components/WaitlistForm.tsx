import { useState } from "react";

interface Props {
  dinnerSlug: string;
  dinnerTitle: string;
}

type Status = "idle" | "sending" | "success" | "error";

export default function WaitlistForm({ dinnerSlug, dinnerTitle }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setStatus("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, dinnerSlug, dinnerTitle }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Request failed");
      setStatus("success");
      setMessage(
        json.smsSent
          ? "You're on the list. We just texted your number to confirm — we'll message you the moment a seat opens."
          : "You're on the list. We'll email and text you the moment a seat opens.",
      );
      form.reset();
    } catch (err) {
      setStatus("error");
      setMessage("Something went wrong. Please try again in a moment.");
    }
  }

  if (status === "success") {
    return (
      <div className="form-status" data-state="success">
        {message}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
        <div className="form-field">
          <label htmlFor={`wl-name-${dinnerSlug}`}>Name</label>
          <input id={`wl-name-${dinnerSlug}`} name="name" type="text" required autoComplete="name" />
        </div>
        <div className="form-field">
          <label htmlFor={`wl-email-${dinnerSlug}`}>Email</label>
          <input id={`wl-email-${dinnerSlug}`} name="email" type="email" required autoComplete="email" />
        </div>
        <div className="form-field">
          <label htmlFor={`wl-phone-${dinnerSlug}`}>Mobile (for SMS)</label>
          <input id={`wl-phone-${dinnerSlug}`} name="phone" type="tel" required autoComplete="tel" placeholder="+380…" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn-primary" disabled={status === "sending"}>
          {status === "sending" ? "Joining…" : "Join the waitlist"}
        </button>
        <span className="text-sm text-mute">We only text you about this dinner. Reply STOP any time.</span>
      </div>
      {status === "error" && (
        <div className="form-status" data-state="error">
          {message}
        </div>
      )}
    </form>
  );
}
