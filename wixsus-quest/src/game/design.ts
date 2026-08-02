import type { CSSProperties } from 'react';
import { BUSINESSES, CTAS, FONTS, IMAGE_STYLES, PALETTES, RADII, TONES } from './quest';

export type Palette = (typeof PALETTES)[keyof typeof PALETTES];
export type FontPair = (typeof FONTS)[keyof typeof FONTS];
export type Business = (typeof BUSINESSES)[keyof typeof BUSINESSES];
export type Tone = (typeof TONES)[keyof typeof TONES];
export type ImageStyle = (typeof IMAGE_STYLES)[keyof typeof IMAGE_STYLES];
export type Radius = (typeof RADII)[keyof typeof RADII];
export type Cta = (typeof CTAS)[keyof typeof CTAS];

export interface DesignTokens {
  palette?: Palette;
  fontPair?: FontPair;
  business?: Business;
  tone?: Tone;
  imageStyle?: ImageStyle;
  radius?: Radius;
  servicesCount?: { count: number; name: string };
  cta?: Cta;
  wixApps?: string[];
  template?: { name: string; layout: string };
}

export type SitePart = 'hero' | 'about' | 'gallery' | 'services' | 'features';

export const NEUTRAL: Palette = {
  name: 'Сіре ніщо',
  bg: '#EDEDED',
  surface: '#F7F7F7',
  text: '#9A9A9A',
  accent: '#C4C4C4',
  accentText: '#5A5A5A',
};

export function siteVars(t: DesignTokens): CSSProperties {
  const pal = t.palette ?? NEUTRAL;
  const font = t.fontPair ?? { heading: "'Manrope', sans-serif", body: "'Inter', sans-serif" };
  const radius = t.radius?.radius ?? '18px';
  return {
    ['--bg' as string]: pal.bg,
    ['--surface' as string]: pal.surface,
    ['--text' as string]: pal.text,
    ['--accent' as string]: pal.accent,
    ['--accent-text' as string]: pal.accentText,
    ['--muted' as string]: pal.text + '99',
    ['--font-heading' as string]: font.heading,
    ['--font-body' as string]: font.body,
    ['--radius' as string]: radius,
  };
}

const HUES: Record<string, [string, string]> = {
  sunny: ['#FFD34E', '#FF9F1C'],
  ocean: ['#22B8CF', '#0E7490'],
  forest: ['#7BC96F', '#2F7D32'],
  sunset: ['#FF8A65', '#E85D4A'],
  royal: ['#A084F0', '#6C4BD8'],
  rose: ['#FF8FB3', '#D6336C'],
  slate: ['#9A9A9A', '#4D4D4D'],
};

export interface Tile {
  emoji: string;
  label: string;
  css: CSSProperties;
}

export function galleryTiles(t: DesignTokens): Tile[] {
  const palName = paletteKey(t);
  const [c1, c2] = HUES[palName] ?? ['#C4C4C4', '#9A9A9A'];
  const style = t.imageStyle?.style ?? 'illustration';
  const emojis = t.business?.services?.map((s) => s.icon) ?? ['🖼️', '✨', '🎨', '📸'];

  return emojis.slice(0, 4).map((emoji, i) => {
    let css: CSSProperties = { background: `linear-gradient(135deg, ${c1}, ${c2})` };
    if (style === 'photo') {
      css = {
        background: `linear-gradient(160deg, ${c1} 0%, ${c2} 100%)`,
        boxShadow: 'inset 0 -40px 60px rgba(0,0,0,0.28), inset 0 20px 40px rgba(255,255,255,0.25)',
        filter: 'saturate(1.1)',
      };
    } else if (style === 'illustration') {
      const flat = [c1, c2, c1, c2][i];
      css = { background: flat };
    } else if (style === '3d') {
      css = {
        background: `radial-gradient(circle at 32% 28%, ${lighten(c1)}, ${c2})`,
        boxShadow: '0 18px 30px rgba(0,0,0,0.22), inset -8px -8px 18px rgba(0,0,0,0.18), inset 8px 8px 18px rgba(255,255,255,0.35)',
      };
    } else {
      css = {
        backgroundColor: c2,
        backgroundImage: `radial-gradient(${c1} 22%, transparent 23%), radial-gradient(${c1} 22%, transparent 23%)`,
        backgroundSize: '26px 26px',
        backgroundPosition: '0 0, 13px 13px',
      };
    }
    return { emoji, label: styleLabel(style, i), css };
  });
}

function styleLabel(style: string, i: number): string {
  const sets: Record<string, string[]> = {
    photo: ['Кадр перший', 'У русі', 'Деталі', 'Атмосфера'],
    illustration: ['Ескіз', 'Постер', 'Іконка', 'Обкладинка'],
    '3d': ['Обʼєм', 'Сцена', 'Модель', 'Рендер'],
    pattern: ['Патерн А', 'Патерн Б', 'Патерн В', 'Патерн Г'],
  };
  return (sets[style] ?? sets.illustration)[i] ?? 'Робота';
}

export function paletteKey(t: DesignTokens): string {
  const name = t.palette?.name;
  const entry = Object.entries(PALETTES).find(([, v]) => v.name === name);
  return entry?.[0] ?? 'neutral';
}

function lighten(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + 60);
  const g = Math.min(255, ((n >> 8) & 255) + 60);
  const b = Math.min(255, (n & 255) + 60);
  return `rgb(${r}, ${g}, ${b})`;
}

export const PART_ORDER: SitePart[] = ['hero', 'about', 'gallery', 'services', 'features'];
