import type { APIRoute } from "astro";
import { files } from "@wix/media";
import { auth } from "@wix/essentials";
import { media } from "@wix/sdk";

function json(o: any, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

/**
 * Receives the buyer's reference photo, uploads it to the studio's Wix Media Manager,
 * and returns a viewable URL that gets attached to the order (via the cart buyer note).
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    if (!file) return json({ error: "No file provided." }, 400);
    if (file.size > 15 * 1024 * 1024) return json({ error: "Please keep the photo under 15MB." }, 400);

    const mimeType = file.type || "image/jpeg";
    const fileName = (file as any).name || "reference.jpg";

    const generate = auth.elevate(files.generateFileUploadUrl);
    const { uploadUrl } = await generate(mimeType, { fileName, parentFolderId: undefined as any });

    const bytes = Buffer.from(await file.arrayBuffer());
    const put = await fetch(`${uploadUrl}?filename=${encodeURIComponent(fileName)}`, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: bytes,
    });
    const data: any = await put.json().catch(() => ({}));
    const f = data?.file || data || {};
    let url: string = f.url || f.fileUrl || "";
    if (typeof url === "string" && url.startsWith("wix:image://")) {
      try {
        url = media.getImageUrl(url).url;
      } catch {}
    }
    return json({ ok: true, url, id: f.id || "" });
  } catch (e: any) {
    return json({ error: e?.message || "Upload failed." }, 500);
  }
};
