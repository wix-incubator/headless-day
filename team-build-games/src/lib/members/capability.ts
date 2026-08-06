/**
 * Pure capability model for the members area — decides what a player can do and which "locked"
 * hint to show. Framework-free so it can be unit-tested and reused by both server and client.
 *
 *   anonymous  — not signed in (P2P play with a fighter selection)
 *   member     — signed-in Wix member (custom avatar, saved progress)
 *   paid       — member with an active subscription (ads off, premium perks)  [Track B B3]
 */

export type Capability = "anonymous" | "member" | "paid";

export interface MemberInfo {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
}

const RANK: Record<Capability, number> = { anonymous: 0, member: 1, paid: 2 };

/** Derive the capability tier from the signed-in member (if any) and whether they have an active plan. */
export function capabilityOf(member: MemberInfo | null, hasActivePlan = false): Capability {
  if (!member) return "anonymous";
  return hasActivePlan ? "paid" : "member";
}

/** True when `current` is at or above the `required` tier. */
export function meetsCapability(current: Capability, required: Capability): boolean {
  return RANK[current] >= RANK[required];
}

/** Default unlock hint for a gated feature — sign-in for member tier, upgrade for paid. */
export function defaultLockHint(required: Capability): string {
  return required === "paid" ? "Upgrade your membership to unlock this" : "Sign in to unlock this";
}
