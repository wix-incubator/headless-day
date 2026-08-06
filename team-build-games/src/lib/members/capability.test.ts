import { describe, expect, it } from "vitest";
import { capabilityOf, defaultLockHint, meetsCapability, type MemberInfo } from "./capability";

const member: MemberInfo = { id: "m1", name: "Ava", email: "ava@example.com", avatarUrl: null };

describe("capabilityOf", () => {
  it("is anonymous with no member, member when signed in, paid with an active plan", () => {
    expect(capabilityOf(null)).toBe("anonymous");
    expect(capabilityOf(member)).toBe("member");
    expect(capabilityOf(member, true)).toBe("paid");
    expect(capabilityOf(null, true)).toBe("anonymous"); // a plan without a member is impossible → anonymous
  });
});

describe("meetsCapability (rank: anonymous < member < paid)", () => {
  it("passes when the current tier is at or above the required tier", () => {
    expect(meetsCapability("anonymous", "anonymous")).toBe(true);
    expect(meetsCapability("anonymous", "member")).toBe(false);
    expect(meetsCapability("member", "member")).toBe(true);
    expect(meetsCapability("member", "paid")).toBe(false);
    expect(meetsCapability("paid", "member")).toBe(true);
    expect(meetsCapability("paid", "paid")).toBe(true);
  });
});

describe("defaultLockHint", () => {
  it("prompts sign-in for member-gated features and upgrade for paid-gated ones", () => {
    expect(defaultLockHint("member")).toMatch(/sign in/i);
    expect(defaultLockHint("paid")).toMatch(/upgrade/i);
  });
});
