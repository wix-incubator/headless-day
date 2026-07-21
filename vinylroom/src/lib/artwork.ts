const LOCAL_ARTWORK_SOURCES = [
  "/Features125/v4/8c/41/ef/8c41efae-a00f-84cf-9d6f-465bb0fc2f66/dj.aacpwrsd.jpg/",
  "/Features125/v4/bb/a2/f0/bba2f0d7-4d9e-c617-d49e-3ae02fd5d440/dj.xbkfgllk.jpg/",
];

const LOCAL_INTRO_THUMB = "/artwork/acdc-thunderstruck-120.avif";
const LOCAL_INTRO_HERO = "/artwork/acdc-thunderstruck-360.avif";

export function artworkVariant(url: string | undefined, size = 100) {
  if (!url) return undefined;
  const localArtwork = size >= 220 ? LOCAL_INTRO_HERO : LOCAL_INTRO_THUMB;
  if (url === LOCAL_INTRO_THUMB || url === LOCAL_INTRO_HERO) return localArtwork;
  if (LOCAL_ARTWORK_SOURCES.some((source) => url.includes(source))) return localArtwork;
  return url.replace(/\/\d+x\d+bb\.(jpg|png)$/i, `/${size}x${size}bb.$1`);
}
