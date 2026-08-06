import { useEffect, useState } from "react";
import { type Capability, type MemberInfo } from "../../lib/members/capability";

interface CapabilityState {
  loading: boolean;
  member: MemberInfo | null;
  capability: Capability;
}

/** Client hook: reads `/api/me` once to know the current member + capability tier. */
export function useCapability(): CapabilityState {
  const [state, setState] = useState<CapabilityState>({ loading: true, member: null, capability: "anonymous" });
  useEffect(() => {
    let alive = true;
    fetch("/api/me", { headers: { accept: "application/json" } })
      .then((r) => r.json())
      .then((d: { member: MemberInfo | null; capability: Capability }) => {
        if (alive) setState({ loading: false, member: d.member ?? null, capability: d.capability ?? "anonymous" });
      })
      .catch(() => {
        if (alive) setState({ loading: false, member: null, capability: "anonymous" });
      });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
