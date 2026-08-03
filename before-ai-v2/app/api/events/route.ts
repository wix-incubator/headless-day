import { loadStoryEvents } from "../../wix-events";

export async function GET() {
  const payload = await loadStoryEvents();

  return Response.json(payload);
}
