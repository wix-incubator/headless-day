import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AvatarUploader from "../../components/members/AvatarUploader";

describe("AvatarUploader removal control", () => {
  it("shows removal for an existing per-game avatar when enabled", () => {
    const html = renderToStaticMarkup(
      createElement(AvatarUploader, {
        currentUrl: "https://cdn.example.com/arena.png",
        gameId: "arena",
        allowRemove: true,
      }),
    );

    expect(html).toContain("Change photo");
    expect(html).toContain("Remove photo");
  });

  it("does not show removal for an empty or global uploader", () => {
    const emptyGame = renderToStaticMarkup(
      createElement(AvatarUploader, { currentUrl: null, gameId: "arena", allowRemove: true }),
    );
    const global = renderToStaticMarkup(
      createElement(AvatarUploader, { currentUrl: "https://cdn.example.com/profile.png" }),
    );

    expect(emptyGame).not.toContain("Remove photo");
    expect(global).not.toContain("Remove photo");
  });
});
