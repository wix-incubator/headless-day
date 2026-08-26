// Phase-0 auto-classification: keyword heuristics assign category + content flags so the
// submitter never has to. Placeholder for the Phase 1 LLM gate, which validates/overrides these.
import type { Category } from "./jokes";

const WORDS = {
  tech: /\b(computer|laptop|wifi|wi-fi|router|programmer|programming|code|coding|software|developer|sql|debug|bug|javascript|python|server|database|browser|internet|robot|ai|algorithm|binary|udp|tcp|smart (fridge|phone|watch)|app|password|keyboard)\b/i,
  animals: /\b(dog|cat|cow|horse|fish|bird|seagull|bear|alligator|crocodile|snail|chicken|duck|pig|sheep|goat|lion|tiger|elephant|monkey|mouse|rabbit|hamster|snake|spider|bee|ant|owl|frog|penguin)\b/i,
  dark: /\b(death|dead|die|died|dying|kill|killed|grave|graveyard|funeral|coffin|corpse|murder|cemetery|ghost|skeleton|war|orphan|widow|alzheimer|cancer|terminal|stab|stabbed|bones)\b/i,
  nsfw: /\b(sex|sexual|naked|nude|porn|orgasm|viagra|condom|strip(per|club)?|onlyfans|brothel)\b/i,
  religious: /\b(god|jesus|church|priest|bible|nun|rabbi|imam|mosque|synagogue|heaven|hell|pope|prayer|monk)\b/i,
  political: /\b(president|politician|election|congress|parliament|senator|minister|government|democrat|republican|vote|voting|campaign)\b/i,
  explicit: /\b(fuck|fucking|shit|bitch|asshole|bastard|dick|cunt|piss)\b/i,
  selfDeprecating: /\b(my (life|resume|resumé|wallet|therapist|personal trainer)|i'?m (not lazy|a mess|broke|alone)|imaginary friend|nobody likes me|my people)\b/i,
};

export interface Classification {
  category: Category;
  flags: string[];
}

export function classifyJoke(text: string): Classification {
  const t = text.trim();
  const lower = t.toLowerCase();

  const flags: string[] = [];
  if (WORDS.dark.test(lower)) flags.push("dark");
  if (WORDS.nsfw.test(lower)) flags.push("sexual/nsfw");
  if (WORDS.religious.test(lower)) flags.push("religious");
  if (WORDS.political.test(lower)) flags.push("political");
  if (WORDS.explicit.test(lower)) flags.push("explicit-language");

  let category: Category;
  if (/knock[,.\s-]*knock/i.test(lower)) category = "knock-knock";
  else if (/\bdad\b/.test(lower) || /^(why|what|how) (do|did|does|don'?t|can'?t|is|are)\b.*\?/i.test(t)) category = "dad-jokes";
  else if (WORDS.tech.test(lower)) category = "tech/nerd";
  else if (WORDS.animals.test(lower)) category = "animals";
  else if (flags.includes("dark")) category = "dark-humor";
  else if (WORDS.selfDeprecating.test(lower)) category = "self-deprecating";
  else if (t.length > 220) category = "story/anecdote";
  else if ((t.match(/[.!?]+/g) ?? []).length <= 1 && t.length < 130) category = "one-liners";
  else category = "other";

  return { category, flags };
}
