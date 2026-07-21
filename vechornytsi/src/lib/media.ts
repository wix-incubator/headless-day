// Generated scene imagery (Wix AI → Wix Media). Referenced by the hand-authored
// pages. Dinner + product images live on their CMS items / Stores products.
export const SCENES = {
  hero: "https://static.wixstatic.com/media/699ede_5db4deb0688649179b789cc205f150fa~mv2.png",
  story: "https://static.wixstatic.com/media/699ede_a366a440cfb44e2aa4f2e4aff9f862f1~mv2.png",
  dish: "https://static.wixstatic.com/media/699ede_9886e67477024176bef15fbca4bf35d3~mv2.png",
  forage: "https://static.wixstatic.com/media/699ede_1bdb7731ba47418d950f2250df08b518~mv2.png",
  forage2: "https://static.wixstatic.com/media/699ede_ffba2792688a4855b674e3a87d4d2601~mv2.png",
  boathouse: "https://static.wixstatic.com/media/699ede_4523631d7cd244aab47c7207d2ff3a2e~mv2.png",
  aboutRoom: "https://static.wixstatic.com/media/699ede_017312d64956476d90cfdfd714fba4af~mv2.png",
} as const;

// Representative product photo per home "From the pantry" category tile.
export const CATEGORY_TILES: Record<string, string> = {
  Pantry: "https://static.wixstatic.com/media/699ede_5cd39899e4a049e9be9f7c76e7844de6~mv2.png",
  Ceramics: "https://static.wixstatic.com/media/699ede_7463deb6210b4877adcf885f60f8021f~mv2.png",
  "The Table": "https://static.wixstatic.com/media/699ede_f2f881f6ab184675b506765641f73859~mv2.png",
  Vouchers: "https://static.wixstatic.com/media/699ede_877d6559c5e841d993d5d52bb5697401~mv2.png",
};

/** Add a Wix CDN transform so we don't ship 1MB PNGs — fit/quality/format. */
export function sized(url: string, w: number, h: number): string {
  if (!url || !url.includes("wixstatic.com")) return url;
  return `${url}/v1/fill/w_${w},h_${h},al_c,q_82,enc_auto/image.jpg`;
}
