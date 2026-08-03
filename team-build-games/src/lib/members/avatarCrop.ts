/** Center square crop of a w×h image — the largest centered square. Used to make avatars square. */
export interface CropRect {
  sx: number;
  sy: number;
  side: number;
}

export function coverCropRect(w: number, h: number): CropRect {
  const side = Math.min(w, h);
  return { sx: Math.round((w - side) / 2), sy: Math.round((h - side) / 2), side };
}
