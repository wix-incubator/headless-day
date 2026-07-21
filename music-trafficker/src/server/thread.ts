import { posts } from "@wix/blog";

/** The Wix Blog app id — comments are keyed to it. */
export const BLOG_APP_ID = "14bcded7-0066-7c35-14d7-466cb3f09103";

/** The single seeded discussion post: "What do you think of AI music?" */
export const THREAD_POST_ID = "7ed6fe11-3420-4585-9a20-56b61cf03626";

let cachedReference: { referenceId: string; title: string } | null = null;

/** Comments key off the post's referenceId — resolve it once and cache. */
export async function getThreadReference() {
  if (cachedReference) return cachedReference;
  const result: any = await posts.getPost(THREAD_POST_ID, {
    fieldsets: ["REFERENCE_ID"] as any,
  });
  const post = result?.post ?? result;
  // Legacy-migrated posts carry a distinct referenceId; on fresh Blog V3
  // sites it's absent and comments key directly on the post id (verified
  // against the live Comments API).
  const referenceId = (post as any)?.referenceId ?? THREAD_POST_ID;
  cachedReference = { referenceId, title: post?.title ?? "" };
  return cachedReference;
}

interface RicosNode {
  type?: string;
  nodes?: RicosNode[];
  textData?: { text?: string };
}

export function plainTextToRicos(text: string) {
  const paragraphs = text.split(/\n+/).filter((p) => p.trim().length > 0);
  return {
    nodes: paragraphs.map((p, i) => ({
      type: "PARAGRAPH",
      id: `p${i + 1}`,
      nodes: [
        { type: "TEXT", id: "", nodes: [], textData: { text: p, decorations: [] } },
      ],
      paragraphData: {},
    })),
  };
}

export function ricosToPlainText(richContent: { nodes?: RicosNode[] } | undefined) {
  const parts: string[] = [];
  const walk = (nodes: RicosNode[] | undefined, sink: string[]) => {
    for (const node of nodes ?? []) {
      if (node.type === "TEXT" && node.textData?.text) sink.push(node.textData.text);
      else walk(node.nodes, sink);
    }
  };
  for (const block of richContent?.nodes ?? []) {
    const sink: string[] = [];
    walk([block], sink);
    if (sink.length) parts.push(sink.join(""));
  }
  return parts.join("\n");
}
