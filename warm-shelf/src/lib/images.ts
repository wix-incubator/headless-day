// Central image registry. Wix Media URLs (static.wixstatic.com), served via plain <img>.

const M = (id: string) => `https://static.wixstatic.com/media/${id}`;

export const HERO = M('4b150e_aef62eb68e3d4ae38cee0a8750f80c29~mv2.png');
export const INTERIOR = M('4b150e_6eade6780c8649c7a35bcf2a4f97bc86~mv2.png');
export const TERRACE = M('4b150e_33f7ee2f689f43adb6b991c1eadd2483~mv2.png');
export const EVENTS_BANNER = M('4b150e_b63544fbfa124dd9bb903df1685e8e51~mv2.png');

const COFFEEBAR = M('4b150e_7904bc94faf543d3a37102c8b9b1d091~mv2.png');
const NOOK = M('4b150e_c277663344bb4c7a9904c08236df42f8~mv2.png');
const SHELVES = M('4b150e_1f49d46aacdc40aeb8975c782f13b4c9~mv2.png');
const ARMCHAIRS = M('4b150e_610fb161bf7f4f0e9e45c39d72f789c7~mv2.png');

// Café-space slider — different spaces & places of the café.
export const SLIDER: { url: string; caption: string; sub?: string }[] = [
	{ url: HERO, caption: 'The main room', sub: 'Shelves, plants & soft light' },
	{ url: COFFEEBAR, caption: 'The coffee bar', sub: 'Espresso, pastries & warm cups' },
	{ url: NOOK, caption: 'The window nook', sub: 'A bench, a throw, a good book' },
	{ url: SHELVES, caption: 'Between the shelves', sub: 'Plants, ladders & quiet corners' },
	{ url: ARMCHAIRS, caption: 'The armchair cluster', sub: 'Blankets, poufs & lamplight' },
	{ url: TERRACE, caption: 'The summer terrace', sub: 'Open till late in warm months' },
];

// Event-atmosphere gallery pool (assigned by index/seed — no content pinned).
export const EVENT_GALLERY: string[] = [
	M('4b150e_65db79abf5ec4c0ba5100289cc20dc70~mv2.png'), // reading
	M('4b150e_920dbd9c1b1c40c797cc7b1e648431c8~mv2.png'), // audience
	M('4b150e_2fa4d0fe51174fb89d821e6cd7e0029e~mv2.png'), // terrace poetry
	M('4b150e_891a6a7b41b34a878be82b75e688a0cf~mv2.png'), // book club
	M('4b150e_2b253fb450a040c6956ac9fd1146c794~mv2.png'), // signing
	M('4b150e_06df252647b548a49a61922e65703465~mv2.png'), // details
];

// Ex libris service imagery.
export const EXLIBRIS_STAMP = M('4b150e_0dbe3f46f60a45be91faf721ac4d4f49~mv2.png');
export const EXLIBRIS_DETAIL = M('4b150e_c7f1d5cc32d9429d9946a3ad422308c8~mv2.png');

// Deterministic pick of n images from a pool, seeded by a string (no external content pinned).
export function galleryFor(seed: string, pool: string[], n = 3): string[] {
	if (pool.length === 0) return [];
	let h = 0;
	for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
	const out: string[] = [];
	for (let i = 0; i < Math.min(n, pool.length); i++) out.push(pool[(h + i) % pool.length]);
	return out;
}
