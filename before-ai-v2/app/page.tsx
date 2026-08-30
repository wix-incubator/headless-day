import { XpDesktop } from "./xp-desktop";
import { loadStoryEvents } from "./wix-events";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { events, source } = await loadStoryEvents();

  return <XpDesktop events={events} eventsSource={source} />;
}
