/** Five-panel image comic played before an Overrun campaign match. */

import { useEffect, useState } from "react";

export const COMIC_SLIDE_MS = 2000;

interface SpeechBubble {
  text: string;
  position: string;
  accent: string;
  tail: "left" | "center" | "right" | "top-right";
}

interface SoundEffect {
  text: string;
  position: string;
  color: string;
  rotation: string;
}

interface ComicSlide {
  src: string;
  caption: string;
  alt: string;
  bubbles?: SpeechBubble[];
  effects?: SoundEffect[];
}

const SLIDES: ComicSlide[] = [
  {
    src: "/assets/overrun/comic/slide-1-preparation.webp",
    caption: "READY ROOM — 0600",
    alt: "Four special forces operators clean weapons, load ammunition, pack a backpack, and attach equipment in the ready room.",
    effects: [
      {
        text: "CLICK",
        position: "left-[7%] top-[58%]",
        color: "text-cyan-200",
        rotation: "-rotate-6",
      },
      {
        text: "CLANG",
        position: "left-[42%] top-[61%]",
        color: "text-amber-200",
        rotation: "rotate-3",
      },
      {
        text: "CACHING",
        position: "right-[7%] top-[58%]",
        color: "text-emerald-200",
        rotation: "rotate-6",
      },
    ],
  },
  {
    src: "/assets/overrun/comic/slide-2-general.webp",
    caption: "INCOMING COMMAND",
    alt: "The four-person squad faces a communications screen showing a stern white-haired general.",
    bubbles: [
      {
        text: "Squad, you have a mission!",
        position: "right-[5%] top-[5%] w-[31%]",
        accent: "border-cyan-300",
        tail: "left",
      },
    ],
  },
  {
    src: "/assets/overrun/comic/slide-3-ready.webp",
    caption: "GEAR UP",
    alt: "The fully equipped squad moves through the armored exit with helmets, loaded vests, backpacks, and weapons ready.",
    bubbles: [
      {
        text: "Squad, focus!",
        position: "right-[3%] top-[31%] w-[20%]",
        accent: "border-emerald-300",
        tail: "top-right",
      },
      {
        text: "My bones almost become rusty",
        position: "left-[28%] top-[3%] w-[28%]",
        accent: "border-amber-300",
        tail: "center",
      },
      {
        text: "Finally!",
        position: "left-[61%] top-[4%] w-[15%]",
        accent: "border-fuchsia-300",
        tail: "center",
      },
    ],
  },
  {
    src: "/assets/overrun/comic/slide-4-en-route.webp",
    caption: "EN ROUTE",
    alt: "The four fully equipped operators sit inside an armored truck, serious and holding their weapons under red mission lights.",
    effects: [
      {
        text: "VRRROOM",
        position: "left-[4%] top-[7%]",
        color: "text-red-200",
        rotation: "-rotate-6",
      },
      {
        text: "RATTLE",
        position: "right-[5%] top-[9%]",
        color: "text-amber-200",
        rotation: "rotate-6",
      },
    ],
  },
  {
    src: "/assets/overrun/comic/slide-5-lab.webp",
    caption: "OBJECTIVE: SCIENCE LAB",
    alt: "The squad crosses a city parking lot toward a science laboratory after a localized incident left abandoned cars, broken glass, and light damage.",
    effects: [
      {
        text: "THUD",
        position: "left-[12%] top-[72%]",
        color: "text-cyan-200",
        rotation: "-rotate-6",
      },
      {
        text: "CLACK",
        position: "left-[34%] top-[76%]",
        color: "text-amber-200",
        rotation: "rotate-3",
      },
      {
        text: "STEP",
        position: "left-[55%] top-[71%]",
        color: "text-emerald-200",
        rotation: "-rotate-3",
      },
    ],
  },
];

export default function OverrunComic({ onDone }: { onDone?: () => void }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (index >= SLIDES.length - 1) onDone?.();
      else setIndex((current) => current + 1);
    }, COMIC_SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [index, onDone]);

  useEffect(() => {
    for (const slide of SLIDES) {
      const image = new Image();
      image.src = slide.src;
    }
  }, []);

  const slide = SLIDES[index]!;

  return (
    <div className="relative mx-auto w-full max-w-4xl select-none">
      <style>{`
        @keyframes overrunComicIn {
          from { opacity: 0; transform: scale(1.025); }
          to { opacity: 1; transform: scale(1); }
        }
        .overrun-comic-slide { animation: overrunComicIn 360ms ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .overrun-comic-slide { animation: none; }
        }
      `}</style>

      <div
        className="relative overflow-hidden rounded-lg border-2 border-cyan-400/40 bg-neutral-950 shadow-[0_0_50px_rgb(34_211_238/0.15)]"
        style={{ aspectRatio: "8 / 5" }}
        aria-live="polite"
      >
        <div key={index} className="overrun-comic-slide absolute inset-0">
          <img
            src={slide.src}
            alt={slide.alt}
            className="h-full w-full object-cover"
            draggable={false}
          />

          {slide.bubbles?.map((bubble) => (
            <ComicBubble key={bubble.text} {...bubble} />
          ))}

          {slide.effects?.map((effect) => (
            <ComicSoundEffect key={effect.text} {...effect} />
          ))}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black via-black/65 to-transparent px-4 pb-3 pt-12">
            <span className="font-display text-[clamp(7px,1.2vw,10px)] text-cyan-200 [text-shadow:0_1px_8px_#000]">
              {slide.caption}
            </span>
            <span className="font-display text-[clamp(7px,1.2vw,10px)] text-neutral-300 [text-shadow:0_1px_8px_#000]">
              {index + 1} / {SLIDES.length}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1.5" aria-hidden="true">
          {SLIDES.map((slideItem, slideIndex) => (
            <span
              key={slideItem.src}
              className={`h-1.5 w-6 rounded-full ${slideIndex <= index ? "bg-cyan-400" : "bg-white/15"}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => onDone?.()}
          className="font-display text-[9px] text-neutral-500 transition hover:text-cyan-300"
        >
          SKIP ▸
        </button>
      </div>
    </div>
  );
}

function ComicBubble({ text, position, accent, tail }: SpeechBubble) {
  const tailAbove = tail === "top-right";
  const tailPosition =
    tail === "left"
      ? "left-[18%]"
      : tail === "right"
        ? "right-[18%]"
        : "left-1/2 -translate-x-1/2";

  return (
    <div
      className={`absolute ${position} rounded-md border-2 ${accent} bg-neutral-950/95 px-[clamp(6px,1vw,12px)] py-[clamp(4px,0.8vw,9px)] text-center font-display text-[clamp(8px,1.35vw,15px)] leading-[1.35] text-white shadow-[0_4px_18px_rgb(0_0_0/0.65)]`}
    >
      {text}
      <span
        aria-hidden="true"
        className={`absolute ${
          tailAbove
            ? "-top-[7px] right-[18%] border-l-2 border-t-2"
            : `-bottom-[7px] ${tailPosition} border-b-2 border-r-2`
        } h-3 w-3 rotate-45 ${accent} bg-neutral-950`}
      />
    </div>
  );
}

function ComicSoundEffect({ text, position, color, rotation }: SoundEffect) {
  return (
    <span
      className={`pointer-events-none absolute ${position} ${rotation} ${color} font-display text-[clamp(11px,2.5vw,25px)] italic [text-shadow:2px_2px_0_#020617,0_0_10px_currentColor]`}
      aria-label={`Sound effect: ${text}`}
    >
      {text}
    </span>
  );
}
