#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const siteConfig = JSON.parse(await readFile(new URL("../wix.config.json", import.meta.url), "utf8"));
const siteId = siteConfig.siteId;
const recreate = process.argv.includes("--recreate");

if (!siteId) {
  throw new Error("Missing siteId in wix.config.json");
}

const skins = [
  {
    envKey: "ARENA_SKIN_NEON_RONIN_PRODUCT_ID",
    id: "neon-ronin",
    name: "Arena Skin — Neon Ronin",
    imagePath: new URL("../public/assets/arena/skins/neon-ronin.png", import.meta.url),
    fileName: "arena-skin-neon-ronin.png",
    description:
      "Unlock the Neon Ronin Arena skin: a cyber-edged fighter silhouette with cyan blade energy and magenta underglow. Cosmetic member-only skin for TeamBuild Games Arena.",
  },
  {
    envKey: "ARENA_SKIN_SOLAR_WARDEN_PRODUCT_ID",
    id: "solar-warden",
    name: "Arena Skin — Solar Warden",
    imagePath: new URL("../public/assets/arena/skins/solar-warden.png", import.meta.url),
    fileName: "arena-skin-solar-warden.png",
    description:
      "Unlock the Solar Warden Arena skin: a radiant guardian look with gold armor glow and bright heroic energy. Cosmetic member-only skin for TeamBuild Games Arena.",
  },
];

const richDescription = (text, id) => ({
  nodes: [
    {
      type: "PARAGRAPH",
      id: `${id}-desc`,
      nodes: [{ type: "TEXT", textData: { text } }],
      paragraphData: { textStyle: { textAlignment: "AUTO" } },
    },
  ],
  metadata: { version: 1, id: `${id}-description` },
});

const token = (
  await execFileAsync(
    "npx",
    ["@wix/cli@latest", "token", "--site", siteId],
    { timeout: 120_000, maxBuffer: 1024 * 1024 },
  )
).stdout.trim();

if (!token) {
  throw new Error("Wix CLI returned an empty site token");
}

async function wix(path, { method = "POST", body } = {}) {
  const response = await fetch(`https://www.wixapis.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "wix-site-id": siteId,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!response.ok) {
    throw new Error(`${method} ${path} failed ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function findExistingProduct(name) {
  const data = await wix("/stores/v3/products/search", {
    body: { search: { expression: name } },
  });
  const products = data.products ?? data.items ?? [];
  return products.find((product) => product.name === name);
}

async function uploadImage(skin) {
  const bytes = await readFile(skin.imagePath);
  const upload = await wix("/site-media/v1/files/generate-upload-url", {
    body: {
      mimeType: "image/png",
      fileName: skin.fileName,
      sizeInBytes: String(bytes.byteLength),
      private: false,
      labels: ["arena", "skin", skin.id],
    },
  });
  if (!upload.uploadUrl) {
    throw new Error(`No uploadUrl returned for ${skin.name}`);
  }

  const put = await fetch(`${upload.uploadUrl}?filename=${encodeURIComponent(skin.fileName)}`, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: bytes,
  });
  const text = await put.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!put.ok) {
    throw new Error(`Media upload failed ${put.status}: ${JSON.stringify(data)}`);
  }
  const url = data.file?.url;
  if (!url) {
    throw new Error(`Media upload returned no file.url for ${skin.name}: ${JSON.stringify(data)}`);
  }
  return { id: data.file?.id || data.file?._id, url };
}

async function deleteProduct(productId) {
  await wix(`/stores/v3/products/${encodeURIComponent(productId)}`, { method: "DELETE" });
}

async function createProduct(skin, image) {
  const data = await wix("/stores/v3/products", {
    body: {
      product: {
        name: skin.name,
        description: richDescription(skin.description, skin.id),
        productType: "DIGITAL",
        visible: true,
        media: {
          main: { url: image.url, altText: `${skin.name} preview` },
          itemsInfo: {
            items: [{ url: image.url, altText: `${skin.name} preview` }],
          },
        },
        variantsInfo: {
          variants: [
            {
              price: { actualPrice: { amount: "2.00" } },
              ...(image.id ? { digitalProperties: { digitalFile: { id: image.id } } } : {}),
              visible: true,
            },
          ],
        },
      },
    },
  });
  const product = data.product ?? data;
  const id = product.id ?? product._id;
  if (!id) {
    throw new Error(`Create product returned no id for ${skin.name}: ${JSON.stringify(data)}`);
  }
  return product;
}

const results = [];

for (const skin of skins) {
  const existing = await findExistingProduct(skin.name);
  if (existing && !recreate) {
    results.push({
      skin: skin.id,
      name: skin.name,
      status: "reused",
      productId: existing.id ?? existing._id,
    });
    continue;
  }
  if (existing && recreate) {
    const productId = existing.id ?? existing._id;
    if (!productId) {
      throw new Error(`Existing product has no id: ${JSON.stringify(existing)}`);
    }
    await deleteProduct(productId);
  }

  const image = await uploadImage(skin);
  const product = await createProduct(skin, image);
  results.push({
    skin: skin.id,
    name: skin.name,
    status: existing ? "recreated" : "created",
    productId: product.id ?? product._id,
    imageUrl: image.url,
  });
}

for (const result of results) {
  console.log(`${result.status.toUpperCase()} ${result.name}: ${result.productId}`);
}
console.log(JSON.stringify({ siteId, results }, null, 2));
