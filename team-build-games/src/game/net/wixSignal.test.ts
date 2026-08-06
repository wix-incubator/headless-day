import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeWixTopicAdapter, type WixSignalDeps } from "./wixSignal";

const TOPIC = "f".repeat(40);

interface FakeSub {
  topic: string;
  id: string;
  handlers: Parameters<WixSignalDeps["subscribe"]>[1];
}

function makeFakes() {
  const subs: FakeSub[] = [];
  const unsubscribed: string[] = [];
  const posted: Array<{ topic: string; msg: string }> = [];
  let nextPost: { ok: boolean; status: number | null; message?: string } = { ok: true, status: 200 };
  const deps: WixSignalDeps = {
    subscribe: (topic, handlers) => {
      const id = `sub-${subs.length}`;
      subs.push({ topic, id, handlers });
      return id;
    },
    unsubscribe: (id) => {
      unsubscribed.push(id);
    },
    post: async (body) => {
      posted.push(body);
      return nextPost;
    },
  };
  return { deps, subs, unsubscribed, posted, setPost: (p: typeof nextPost) => (nextPost = p) };
}

describe("makeWixTopicAdapter subscribeTopic", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("resolves with a cleanup after the subscription is ready; cleanup unsubscribes once", async () => {
    const { deps, subs, unsubscribed } = makeFakes();
    const adapter = makeWixTopicAdapter(deps);
    const p = adapter.subscribeTopic({}, TOPIC, vi.fn());
    subs[0]!.handlers.onReady();
    const cleanup = await p;
    expect(subs[0]!.topic).toBe(TOPIC);
    cleanup();
    cleanup();
    expect(unsubscribed).toEqual(["sub-0"]);
  });

  it("delivers wrapped payload strings to onMessage with the topic", async () => {
    const { deps, subs } = makeFakes();
    const onMessage = vi.fn();
    const p = makeWixTopicAdapter(deps).subscribeTopic({}, TOPIC, onMessage);
    subs[0]!.handlers.onReady();
    await p;
    subs[0]!.handlers.onPayload({ m: "sig-data" });
    expect(onMessage).toHaveBeenCalledWith(TOPIC, "sig-data");
  });

  it("drops malformed payloads", async () => {
    const { deps, subs } = makeFakes();
    const onMessage = vi.fn();
    const p = makeWixTopicAdapter(deps).subscribeTopic({}, TOPIC, onMessage);
    subs[0]!.handlers.onReady();
    await p;
    subs[0]!.handlers.onPayload({ nope: 1 });
    subs[0]!.handlers.onPayload(null);
    subs[0]!.handlers.onPayload({ m: 42 });
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("stops delivering after cleanup", async () => {
    const { deps, subs } = makeFakes();
    const onMessage = vi.fn();
    const p = makeWixTopicAdapter(deps).subscribeTopic({}, TOPIC, onMessage);
    subs[0]!.handlers.onReady();
    const cleanup = await p;
    cleanup();
    subs[0]!.handlers.onPayload({ m: "late" });
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("rejects when a non-recoverable error arrives before ready", async () => {
    const { deps, subs, unsubscribed } = makeFakes();
    const p = makeWixTopicAdapter(deps).subscribeTopic({}, TOPIC, vi.fn());
    const assertion = expect(p).rejects.toThrow(/denied/);
    subs[0]!.handlers.onError({ recoverable: false, message: "denied" });
    await assertion;
    expect(unsubscribed).toEqual(["sub-0"]);
  });

  it("stays pending through recoverable errors, then resolves on ready", async () => {
    const { deps, subs } = makeFakes();
    const p = makeWixTopicAdapter(deps).subscribeTopic({}, TOPIC, vi.fn());
    subs[0]!.handlers.onError({ recoverable: true, message: "reconnecting" });
    subs[0]!.handlers.onReady();
    await expect(p).resolves.toBeTypeOf("function");
  });

  it("rejects if the subscription never becomes ready within the timeout", async () => {
    const { deps, unsubscribed } = makeFakes();
    const p = makeWixTopicAdapter({ ...deps, readyTimeoutMs: 5000 }).subscribeTopic({}, TOPIC, vi.fn());
    const assertion = expect(p).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(5001);
    await assertion;
    expect(unsubscribed).toEqual(["sub-0"]);
  });
});

describe("makeWixTopicAdapter publishTopic", () => {
  it("posts the topic and string message", async () => {
    const { deps, posted } = makeFakes();
    await makeWixTopicAdapter(deps).publishTopic({}, TOPIC, "encrypted-sdp");
    expect(posted).toEqual([{ topic: TOPIC, msg: "encrypted-sdp" }]);
  });

  it("serializes object messages", async () => {
    const { deps, posted } = makeFakes();
    await makeWixTopicAdapter(deps).publishTopic({}, TOPIC, { peerId: "p1" });
    expect(posted).toEqual([{ topic: TOPIC, msg: '{"peerId":"p1"}' }]);
  });

  it("throws on a failed post", async () => {
    const { deps, setPost } = makeFakes();
    setPost({ ok: false, status: 429, message: "throttled" });
    await expect(makeWixTopicAdapter(deps).publishTopic({}, TOPIC, "x")).rejects.toThrow(/throttled/);
  });
});
