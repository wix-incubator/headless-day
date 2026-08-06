/**
 * Realtime Lab island (see docs/superpowers/specs/2026-07-16-realtime-lab-design.md).
 *
 * Measures Wix Realtime as a game comms channel. Configured entirely via query params
 * (parseConfig); acts as publisher (POSTs padded payloads through /api/rt-publish),
 * subscriber (records arrivals), or both. All math lives in ../../lib/rtlab — this file
 * only wires timers, fetch, and the subscription.
 *
 * Results contract for automation: live JSON snapshot in <pre id="results"> (refreshed
 * every 2s and on finish), `data-done="1"` on it when the publisher run has ended, and
 * the same object on window.__rtlabResults.
 */

import { useEffect, useRef, useState } from "react";
import { subscriber } from "@wix/realtime";
import {
  aggregateRecv,
  aggregateSent,
  buildPayload,
  buildStagePlan,
  parseConfig,
  type LabConfig,
  type LabPayload,
  type RecvEvent,
  type SentEvent,
  type StagePlan,
} from "../../lib/rtlab/runner";

const CHANNEL = "rtlab-main";

/**
 * Worker-based metronome: hidden tabs clamp main-thread timers to 1 Hz, which would
 * silently destroy publisher rates in background Playwright tabs. Worker timers aren't
 * visibility-throttled; each tick posts back to the main thread (message tasks aren't
 * clamped either).
 */
function startMetronome(intervalMs: number, onTick: () => void): () => void {
  const src = `let t=null;onmessage=(e)=>{if(e.data.cmd==="start"){t=setInterval(()=>postMessage(0),e.data.interval)}else{clearInterval(t);close()}};`;
  const worker = new Worker(URL.createObjectURL(new Blob([src], { type: "application/javascript" })));
  worker.onmessage = onTick;
  worker.postMessage({ cmd: "start", interval: intervalMs });
  return () => worker.postMessage({ cmd: "stop" });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface SubscribeInfo {
  requestedAt: number;
  subscribeMs?: number;
  isSynced?: boolean;
  subscribedCount: number;
  errors: Array<{ at: number; errorCode: string; recoverable?: boolean; status?: number; message: string }>;
}

export default function RtLab() {
  const [cfg] = useState<LabConfig>(() => parseConfig(window.location.search));
  const [status, setStatus] = useState("idle");
  const [resultsJson, setResultsJson] = useState("");
  const [done, setDone] = useState(false);
  const [live, setLive] = useState({ sent: 0, ok: 0, failed: 0, recv: 0, lastE2eMs: -1 });

  const sentRef = useRef<SentEvent[]>([]);
  const recvRef = useRef<RecvEvent[]>([]);
  const logRef = useRef<string[]>([]);
  const subInfoRef = useRef<SubscribeInfo>({ requestedAt: 0, subscribedCount: 0, errors: [] });
  const startedRef = useRef(false);
  const doneRef = useRef(false);

  const log = (msg: string) => {
    logRef.current.push(`${new Date().toISOString()} ${msg}`);
  };

  const snapshot = () => ({
    config: cfg,
    channel: { name: CHANNEL, resourceId: cfg.room },
    subscribe: subInfoRef.current,
    sentReports: aggregateSent(sentRef.current),
    recvReports: aggregateRecv(recvRef.current),
    totals: { sent: sentRef.current.length, recv: recvRef.current.length },
    done: doneRef.current,
    log: logRef.current,
  });

  // Subscription (sub/both roles). One subscription per tab, to this tab's room resource.
  useEffect(() => {
    if (cfg.role === "pub") return;
    const info = subInfoRef.current;
    info.requestedAt = Date.now();
    setStatus("subscribing…");
    const subscriptionId = subscriber.subscribe(
      { name: CHANNEL, resourceId: cfg.room },
      (message) => {
        const recvTs = Date.now();
        const p = message.payload as Partial<LabPayload>;
        if (typeof p?.seq !== "number" || typeof p?.sentTs !== "number") return;
        recvRef.current.push({
          room: typeof p.room === "string" ? p.room : cfg.room,
          stage: typeof p.stage === "number" ? p.stage : -1,
          seq: p.seq,
          sentTs: p.sentTs,
          recvTs,
        });
      },
      {
        onSubscribed: (_id, isSynced) => {
          info.subscribedCount += 1;
          info.isSynced = isSynced;
          if (info.subscribeMs === undefined) info.subscribeMs = Date.now() - info.requestedAt;
          log(`subscribed (count=${info.subscribedCount}, isSynced=${isSynced})`);
          setStatus("subscribed");
        },
        onSubscriptionError: (error) => {
          info.errors.push({
            at: Date.now(),
            errorCode: String(error.errorCode),
            recoverable: error.recoverable,
            status: error.status,
            message: error.message,
          });
          log(`subscription error ${error.errorCode} recoverable=${error.recoverable} ${error.message}`);
          setStatus(`subscription error: ${error.errorCode}`);
        },
      },
    );
    return () => subscriber.unsubscribe({ subscriptionId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live counters + results snapshot every 2s (subscriber tabs never "finish" on their own).
  useEffect(() => {
    const id = setInterval(() => {
      const sent = sentRef.current;
      const okCount = sent.filter((e) => e.ok).length;
      const last = recvRef.current[recvRef.current.length - 1];
      setLive({
        sent: sent.length,
        ok: okCount,
        failed: sent.length - okCount,
        recv: recvRef.current.length,
        lastE2eMs: last ? last.recvTs - last.sentTs : -1,
      });
      const snap = snapshot();
      (window as any).__rtlabResults = snap;
      setResultsJson(JSON.stringify(snap, null, 2));
    }, 2000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onVis = () => log(`visibility: ${document.visibilityState}`);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  async function sendOne(plan: StagePlan, seq: number, targetBytes: number): Promise<void> {
    const sentTs = Date.now();
    const payload = buildPayload({ room: cfg.room, stage: plan.stage, seq, sentTs, targetBytes });
    const t0 = performance.now();
    const base = { room: cfg.room, stage: plan.stage, seq, sentTs };
    try {
      const res = await fetch("/api/rt-publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel: CHANNEL, resourceId: cfg.room, payload }),
      });
      const rttMs = performance.now() - t0;
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        publishMs?: number;
        status?: number | null;
        message?: string;
      };
      sentRef.current.push({
        ...base,
        ok: res.ok && data.ok === true,
        status: data.status ?? res.status,
        rttMs: Math.round(rttMs),
        publishMs: data.publishMs,
        message: data.message,
      });
    } catch (e) {
      sentRef.current.push({ ...base, ok: false, status: null, message: (e as Error)?.message ?? String(e) });
    }
  }

  async function runPublisher(): Promise<void> {
    if (startedRef.current) return;
    startedRef.current = true;

    // Probe mode: one 1 Hz stage per payload size. Otherwise: the configured hz ramp.
    const plans: StagePlan[] = cfg.sizesBytes
      ? buildStagePlan(
          cfg.sizesBytes.map(() => 1),
          cfg.stageDurMs,
        )
      : buildStagePlan(cfg.stagesHz, cfg.stageDurMs);

    for (const plan of plans) {
      const targetBytes = cfg.sizesBytes ? cfg.sizesBytes[plan.stage]! : cfg.payloadBytes;
      log(`stage ${plan.stage} start: ${plan.hz} Hz × ${plan.durMs}ms, ${targetBytes}B`);
      setStatus(`stage ${plan.stage}: ${plan.hz} Hz, ${targetBytes}B`);

      const inflight: Promise<void>[] = [];
      let seq = 0;
      await new Promise<void>((resolve) => {
        const stop = startMetronome(1000 / plan.hz, () => {
          if (seq >= plan.expectedSends) {
            stop();
            resolve();
            return;
          }
          inflight.push(sendOne(plan, seq, targetBytes));
          seq += 1;
        });
      });
      await Promise.race([Promise.allSettled(inflight), sleep(15_000)]);
      await sleep(2000); // settle gap: let the fan-out tail land before the next stage

      const stageEvents = sentRef.current.filter((e) => e.stage === plan.stage);
      const failed = stageEvents.filter((e) => !e.ok).length;
      log(`stage ${plan.stage} end: sent=${stageEvents.length} failed=${failed}`);
      if (stageEvents.length > 0 && failed / stageEvents.length > 0.5 && plan !== plans[plans.length - 1]) {
        log(`aborting ramp: stage ${plan.stage} error rate ${((failed / stageEvents.length) * 100).toFixed(0)}%`);
        break;
      }
    }

    doneRef.current = true;
    setDone(true);
    setStatus("done");
    const snap = snapshot();
    (window as any).__rtlabResults = snap;
    setResultsJson(JSON.stringify(snap, null, 2));
  }

  // Auto-start publishers: fixed grace so subscriber tabs (opened first) are connected.
  useEffect(() => {
    if (!cfg.auto || cfg.role === "sub") return;
    const id = setTimeout(() => void runPublisher(), 3000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ fontFamily: "monospace", padding: "1rem", maxWidth: 900 }}>
      <h1>Realtime Lab</h1>
      <p id="config">
        role={cfg.role} room={cfg.room} stages={cfg.stagesHz.join(",")}Hz dur={cfg.stageDurMs / 1000}s size=
        {cfg.payloadBytes}B{cfg.sizesBytes ? ` sizes=${cfg.sizesBytes.join(",")}` : ""} auto={String(cfg.auto)}
      </p>
      <p id="status">status: {status}</p>
      <p id="live">
        sent={live.sent} ok={live.ok} failed={live.failed} recv={live.recv} lastE2e=
        {live.lastE2eMs >= 0 ? `${live.lastE2eMs}ms` : "–"}
      </p>
      {cfg.role !== "sub" && !cfg.auto && (
        <button id="start" onClick={() => void runPublisher()} disabled={startedRef.current}>
          Start publisher
        </button>
      )}
      <pre id="results" data-done={done ? "1" : "0"} style={{ whiteSpace: "pre-wrap", fontSize: 11 }}>
        {resultsJson}
      </pre>
    </main>
  );
}
