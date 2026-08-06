import type { APIRoute } from "astro";
import { members } from "@wix/members";
import { json } from "../../lib/json";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const res = await members.getCurrentMember({ fieldsets: ["FULL"] as never });
    const member = (res as { member?: Record<string, unknown> })?.member;
    if (!member) return json({ loggedIn: false });

    const profile = member.profile as {
      nickname?: string;
      name?: string;
      photo?: { url?: string };
    } | undefined;
    const contact = member.contact as {
      firstName?: string;
      lastName?: string;
      email?: string;
    } | undefined;

    const name =
      profile?.nickname ||
      profile?.name ||
      [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") ||
      "Member";

    return json({
      loggedIn: true,
      name,
      email: contact?.email ?? null,
      avatar: profile?.photo?.url ?? null,
    });
  } catch {
    return json({ loggedIn: false });
  }
};
