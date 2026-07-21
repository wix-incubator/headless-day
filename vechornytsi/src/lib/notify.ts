// SMS notification hook for the waitlist.
//
// Live SMS sending requires a third-party gateway. This module is the single
// integration point: set the four TWILIO_* environment variables (via
// `wix env` / the Wix dashboard secrets) and sends go live with no code change.
// Absent credentials, it no-ops and logs — the waitlist still captures signups
// to the CMS, it just doesn't text yet.
//
// To go live:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM  (an SMS-capable number)

export interface SmsResult {
  sent: boolean;
  reason?: string;
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const sid = import.meta.env.TWILIO_ACCOUNT_SID ?? process.env.TWILIO_ACCOUNT_SID;
  const token = import.meta.env.TWILIO_AUTH_TOKEN ?? process.env.TWILIO_AUTH_TOKEN;
  const from = import.meta.env.TWILIO_FROM ?? process.env.TWILIO_FROM;

  if (!sid || !token || !from) {
    console.info(`[sms:stub] would text ${to}: "${body}" (TWILIO_* not configured)`);
    return { sent: false, reason: "SMS gateway not configured" };
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      },
    );
    if (!res.ok) {
      const detail = await res.text();
      console.error(`[sms] Twilio error ${res.status}: ${detail}`);
      return { sent: false, reason: `gateway responded ${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[sms] send failed:", err);
    return { sent: false, reason: "gateway request failed" };
  }
}

/** Confirmation text sent to a guest the moment they join a dinner's waitlist. */
export function waitlistJoinedMessage(dinnerTitle: string): string {
  return `Vechornytsi — you're on the waitlist for ${dinnerTitle}. We'll text this number the moment a seat opens. Reply STOP to unsubscribe.`;
}

/** Text sent when a seat actually opens up (called by the seat-release flow). */
export function seatOpenedMessage(dinnerTitle: string, reserveUrl: string): string {
  return `Vechornytsi — a seat just opened for ${dinnerTitle}. First to book keeps it: ${reserveUrl}`;
}
