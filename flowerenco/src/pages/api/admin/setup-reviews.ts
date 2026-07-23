import type { APIRoute } from "astro";
import { collections } from "@wix/data";
import { auth } from "@wix/essentials";

function json(o: any, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

// One-time endpoint — call once to create the Reviews CMS collection.
// Remove or protect this file after initial setup.
export const POST: APIRoute = async () => {
  try {
    const create = auth.elevate(collections.createDataCollection);
    await create({
      _id: "Reviews",
      displayName: "Reviews",
      fields: [
        { key: "name",        displayName: "Name",         type: "TEXT"    },
        { key: "email",       displayName: "Email",        type: "TEXT"    },
        { key: "rating",      displayName: "Rating",       type: "NUMBER"  },
        { key: "review",      displayName: "Review",       type: "TEXT"    },
        { key: "photoUrl",    displayName: "Photo URL",    type: "TEXT"    },
        { key: "productName", displayName: "Product",      type: "TEXT"    },
        { key: "approved",    displayName: "Approved",     type: "BOOLEAN" },
      ],
      permissions: {
        insert: "ANYONE",
        read:   "ADMIN",
        update: "ADMIN",
        remove: "ADMIN",
      },
    } as any);
    return json({ ok: true, message: "Reviews collection created." });
  } catch (e: any) {
    return json({ error: e?.message || "Could not create collection." }, 500);
  }
};
