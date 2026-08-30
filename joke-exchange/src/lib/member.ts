// Resolve the current Wix member (if logged in) on the server. Anonymous is a normal state.
import { members } from "@wix/members";

export interface CurrentMember {
  id: string;
  handle: string;
}

export async function getMember(): Promise<CurrentMember | null> {
  try {
    const res = await members.getCurrentMember({ fieldsets: ["FULL"] });
    const m = res.member;
    if (!m?._id) return null;
    const handle =
      m.profile?.nickname ||
      m.profile?.slug ||
      m.loginEmail?.split("@")[0] ||
      `comedian-${m._id.slice(0, 6)}`;
    return { id: m._id, handle: handle.slice(0, 40) };
  } catch {
    return null; // not logged in (or Members Area data unavailable) — treat as anonymous
  }
}
