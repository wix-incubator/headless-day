import type { APIRoute } from "astro";
import {
  extractMotionUrls,
  getCachedStoryboardMeta,
  hasMotionPreview,
  resolveSomeStoryboards,
  setMotionPreviewUrls,
  YT_HEADERS,
  YT_UA,
  type StoryboardMeta,
} from "../../server/youtube";

const CHANNEL_HANDLE = "MusicTrafficker";
const CHANNEL_ID = "UC5D9N79IcFdrPGoymBThZZA";
const CACHE_TTL_MS = 15 * 60 * 1000; // refresh the channel feed every 15 min
const MIN_DURATION_SECONDS = 90; // anything shorter is treated as a Short

export interface VideoItem {
  id: string;
  title: string;
  durationSeconds: number | null;
  storyboard?: StoryboardMeta | null;
  motionPreview?: boolean;
}

let cache: { at: number; videos: VideoItem[] } | null = null;

const UA = YT_UA;

function parseDuration(text: string): number | null {
  const parts = text.split(":").map((p) => parseInt(p, 10));
  if (parts.some(Number.isNaN)) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

/**
 * Primary source: the channel's /videos tab. It lists full videos only
 * (Shorts live in a separate tab), includes durations, and goes deeper
 * than the RSS feed (~30 vs 15 items).
 */
async function fetchFromVideosTab(): Promise<VideoItem[]> {
  const res = await fetch(`https://www.youtube.com/@${CHANNEL_HANDLE}/videos`, {
    headers: YT_HEADERS,
  });
  if (!res.ok) throw new Error(`videos tab HTTP ${res.status}`);
  const html = await res.text();
  setMotionPreviewUrls(extractMotionUrls(html));
  const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!match) throw new Error("ytInitialData not found");
  const data = JSON.parse(match[1]);
  const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs ?? [];
  const selected = tabs.find((t: any) => t?.tabRenderer?.selected);
  const items = selected?.tabRenderer?.content?.richGridRenderer?.contents ?? [];

  const videos: VideoItem[] = [];
  for (const item of items) {
    const lockup = item?.richItemRenderer?.content?.lockupViewModel;
    if (!lockup?.contentId) continue;
    const title = lockup?.metadata?.lockupMetadataViewModel?.title?.content;
    if (!title) continue;
    const durationMatch = JSON.stringify(lockup).match(/"text":"(\d+:\d+(?::\d+)?)"/);
    videos.push({
      id: lockup.contentId,
      title,
      durationSeconds: durationMatch ? parseDuration(durationMatch[1]) : null,
    });
  }
  if (videos.length === 0) throw new Error("no videos parsed from tab");
  return videos;
}

/**
 * Fallback source: the channel RSS feed (latest ~15 items, no durations,
 * may include Shorts). Shorts are filtered out by probing /shorts/<id>:
 * a Short returns 200 there, a regular video redirects to /watch.
 */
async function fetchFromRss(): Promise<VideoItem[]> {
  const res = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
    { headers: { "User-Agent": UA } },
  );
  if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
  const xml = await res.text();
  const entries = [...xml.matchAll(
    /<yt:videoId>([^<]+)<\/yt:videoId>[\s\S]*?<media:title>([^<]*)<\/media:title>/g,
  )].map(([, id, title]) => ({ id, title, durationSeconds: null }));

  const checks = await Promise.all(
    entries.map(async (entry) => {
      try {
        const probe = await fetch(`https://www.youtube.com/shorts/${entry.id}`, {
          method: "HEAD",
          redirect: "manual",
          headers: { "User-Agent": UA },
        });
        return probe.status !== 200; // 200 on /shorts/ => it's a Short
      } catch {
        return true;
      }
    }),
  );
  return entries.filter((_, i) => checks[i]);
}

export const GET: APIRoute = async () => {
  if (!cache || Date.now() - cache.at > CACHE_TTL_MS) {
    let videos: VideoItem[];
    try {
      videos = await fetchFromVideosTab();
    } catch {
      try {
        videos = await fetchFromRss();
      } catch {
        videos = cache?.videos ?? [];
      }
    }
    videos = videos.filter(
      (v) => v.durationSeconds === null || v.durationSeconds >= MIN_DURATION_SECONDS,
    );
    if (videos.length > 0) cache = { at: Date.now(), videos };
  }

  const current = cache?.videos ?? [];
  // Resolve a small batch of missing storyboard specs per request — the
  // client polls until every video carries one, so the cache fills gradually
  // without any single request blocking for long.
  await resolveSomeStoryboards(current.map((v) => v.id));
  const payload = current.map((v) => ({
    ...v,
    storyboard: getCachedStoryboardMeta(v.id),
    motionPreview: hasMotionPreview(v.id),
  }));

  return new Response(JSON.stringify({ videos: payload }), {
    headers: {
      "Content-Type": "application/json",
      // no-store: responses differ as the storyboard cache fills, and the
      // client polls this endpoint to pick up newly published videos.
      "Cache-Control": "no-store",
    },
  });
};
