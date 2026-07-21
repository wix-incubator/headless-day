export function kitUnitPrice(
  type: "single" | "multi",
  strandCount: number,
): number {
  if (type !== "multi") return 40;
  if (strandCount <= 3) return 65;
  if (strandCount <= 5) return 80;
  if (strandCount <= 7) return 95;
  return 110;
}

export function kitLineTotal(
  type: "single" | "multi",
  strandCount: number,
  quantity: number,
): number {
  return kitUnitPrice(type, strandCount) * quantity;
}

export function kitStyleLabel(
  type: "single" | "multi",
  strandCount: number,
): string {
  return type === "multi" ? `${strandCount}-strand` : "Single-strand";
}
