import AppShell from "@/components/AppShell";
import { getListeningRooms } from "@/lib/wix/rooms";

// Static export: live Wix Events are fetched at build time and baked into the
// page. Re-run `wix release` to refresh the listings.
export default async function Home() {
  const { rooms, source } = await getListeningRooms();
  return <AppShell rooms={rooms} source={source} />;
}
