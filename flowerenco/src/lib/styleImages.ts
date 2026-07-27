// Per-product style example images (subject-matched): person / pet / duo × Matte Folk / Glossy Doodle / Blue Willow.
export type StyleImage = { style: string; url: string };

const B = "https://static.wixstatic.com/media/237b05_";

export const STYLE_IMAGES: Record<string, StyleImage[]> = {
  "custom-portrait-vase": [
    { style: "Matte Folk", url: B + "e578da2b3fe44f73a974df93fbfd016d~mv2.png" },
    { style: "Glossy Doodle", url: B + "28c44b24b3884b739f69b89942dfa890~mv2.png" },
    { style: "Blue Willow", url: B + "71f25ad69dbe4352bc50a899439a8005~mv2.png" },
  ],
  "custom-pet-vase": [
    { style: "Matte Folk", url: B + "8fcc810c4cb740f2b4a3a976f01e5e0c~mv2.png" },
    { style: "Glossy Doodle", url: B + "836499cb942547858f671fd18bf3f156~mv2.png" },
    { style: "Blue Willow", url: B + "6175ca10685941deb50900885f070511~mv2.png" },
  ],
  "custom-duo-vase": [
    { style: "Matte Folk", url: B + "cb7f168b948a4ba0842930cc877f1097~mv2.png" },
    { style: "Glossy Doodle", url: B + "d56568cf3779423db5aa6d659af1f42b~mv2.png" },
    { style: "Blue Willow", url: B + "3b0cc45278ab41dbad0372cf517aaaf8~mv2.png" },
  ],
};

export function stylesForSlug(slug?: string): StyleImage[] {
  return (slug && STYLE_IMAGES[slug]) || [];
}
