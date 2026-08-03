import { describe, expect, it } from "vitest";
import { coverCropRect } from "./avatarCrop";

describe("coverCropRect (center square crop for avatars)", () => {
  it("crops the largest centered square from a landscape image", () => {
    expect(coverCropRect(400, 300)).toEqual({ sx: 50, sy: 0, side: 300 });
  });
  it("crops the largest centered square from a portrait image", () => {
    expect(coverCropRect(200, 500)).toEqual({ sx: 0, sy: 150, side: 200 });
  });
  it("is a no-op offset for an already-square image", () => {
    expect(coverCropRect(256, 256)).toEqual({ sx: 0, sy: 0, side: 256 });
  });
});
