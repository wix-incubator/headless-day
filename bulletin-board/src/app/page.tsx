"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface PinItem {
  id: number;
  x: number;
  y: number;
  type: "note" | "tag";
  content: string;
  color?: string;
  rotation: number;
}

const PINS: PinItem[] = [
  { id: 1, x: 320, y: 200, type: "note", content: "Welcome to my portfolio!\nDrag around to explore.", color: "#fef08a", rotation: -2 },
  { id: 2, x: 750, y: 150, type: "note", content: "UX Designer &\nCreative Thinker", color: "#bbf7d0", rotation: 3 },
  { id: 3, x: 1100, y: 280, type: "note", content: "✨ Currently open to\nnew opportunities", color: "#fecaca", rotation: -1 },
  { id: 4, x: 500, y: 480, type: "tag", content: "User Research", rotation: 0 },
  { id: 5, x: 680, y: 520, type: "tag", content: "Figma", rotation: 0 },
  { id: 6, x: 820, y: 490, type: "tag", content: "Prototyping", rotation: 0 },
  { id: 7, x: 320, y: 620, type: "note", content: "5+ years crafting digital\nexperiences that delight users.", color: "#e9d5ff", rotation: 2 },
  { id: 8, x: 900, y: 650, type: "note", content: "Let's connect! 👋\nyour@email.com", color: "#bfdbfe", rotation: -3 },
  { id: 9, x: 1200, y: 500, type: "tag", content: "Design Systems", rotation: 0 },
  { id: 10, x: 1350, y: 300, type: "note", content: "\"Good design is\ninvisible.\"", color: "#fed7aa", rotation: 1 },
  { id: 11, x: 150, y: 400, type: "tag", content: "Accessibility", rotation: 0 },
  { id: 12, x: 1050, y: 150, type: "tag", content: "Wix", rotation: 0 },
  { id: 13, x: 200, y: 700, type: "note", content: "This board is infinite!\nDrag in any direction →", color: "#fef08a", rotation: -1 },
  { id: 14, x: 600, y: 350, type: "tag", content: "Wireframing", rotation: 0 },
  { id: 15, x: 1400, y: 600, type: "note", content: "Check out my\ncase studies below ↓", color: "#bbf7d0", rotation: 2 },
];

export default function BulletinBoard() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: -300, y: -100 });
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const startDrag = useCallback((x: number, y: number) => {
    isDragging.current = true;
    lastPos.current = { x, y };
  }, []);

  const moveDrag = useCallback((x: number, y: number) => {
    if (!isDragging.current) return;
    const dx = x - lastPos.current.x;
    const dy = y - lastPos.current.y;
    lastPos.current = { x, y };
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const endDrag = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Prevent default touch scroll on the canvas
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("touchmove", prevent, { passive: false });
    return () => el.removeEventListener("touchmove", prevent);
  }, []);

  return (
    <div
      ref={viewportRef}
      className="fixed inset-0 overflow-hidden"
      style={{ cursor: isDragging.current ? "grabbing" : "grab", userSelect: "none" }}
      onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
      onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => moveDrag(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={endDrag}
    >
      {/* Cork board background — extends far beyond viewport so it tiles while panning */}
      <div
        className="absolute"
        style={{
          inset: "-300%",
          backgroundColor: "#c8956c",
          backgroundImage: `
            radial-gradient(ellipse at 20% 30%, rgba(160,110,60,0.18) 0%, transparent 60%),
            radial-gradient(ellipse at 70% 60%, rgba(140,90,40,0.14) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 80%, rgba(180,130,70,0.12) 0%, transparent 40%),
            radial-gradient(circle at 10% 10%, rgba(200,160,100,0.1) 0%, transparent 30%),
            radial-gradient(circle at 90% 90%, rgba(120,80,30,0.1) 0%, transparent 30%),
            repeating-linear-gradient(82deg, transparent, transparent 38px, rgba(160,100,40,0.04) 39px, rgba(160,100,40,0.04) 40px),
            repeating-linear-gradient(8deg, transparent, transparent 28px, rgba(120,70,20,0.04) 29px, rgba(120,70,20,0.04) 30px)
          `,
        }}
      />

      {/* Draggable canvas layer */}
      <div
        className="absolute top-0 left-0"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          willChange: "transform",
          width: 3000,
          height: 2000,
        }}
      >
        {PINS.map((item) =>
          item.type === "tag" ? (
            <TagItem key={item.id} item={item} />
          ) : (
            <NoteItem key={item.id} item={item} />
          )
        )}
      </div>

      {/* Drag hint */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
        <div
          className="px-4 py-2 rounded-full text-sm font-medium"
          style={{
            background: "rgba(0,0,0,0.45)",
            color: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(8px)",
          }}
        >
          🖱 Drag to explore the board
        </div>
      </div>
    </div>
  );
}

function NoteItem({ item }: { item: PinItem }) {
  return (
    <div
      className="absolute"
      style={{
        left: item.x,
        top: item.y,
        transform: `rotate(${item.rotation}deg)`,
        filter: "drop-shadow(2px 4px 10px rgba(0,0,0,0.3))",
      }}
    >
      {/* Pushpin */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: -14,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #f87171, #991b1b)",
          boxShadow: "0 2px 5px rgba(0,0,0,0.5)",
          zIndex: 1,
        }}
      />
      {/* Sticky note */}
      <div
        className="relative p-4 text-sm font-medium whitespace-pre-line leading-relaxed"
        style={{
          background: item.color ?? "#fef9c3",
          minWidth: 160,
          maxWidth: 220,
          boxShadow: "3px 3px 0 rgba(0,0,0,0.07), 0 4px 14px rgba(0,0,0,0.18)",
          color: "#1e293b",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {item.content}
        {/* Folded corner */}
        <div
          className="absolute bottom-0 right-0"
          style={{
            width: 0,
            height: 0,
            borderStyle: "solid",
            borderWidth: "0 0 18px 18px",
            borderColor: `transparent transparent rgba(0,0,0,0.1) transparent`,
          }}
        />
      </div>
    </div>
  );
}

function TagItem({ item }: { item: PinItem }) {
  return (
    <div
      className="absolute flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
      style={{
        left: item.x,
        top: item.y,
        transform: `rotate(${item.rotation}deg)`,
        background: "#1e293b",
        color: "#f8fafc",
        boxShadow: "0 2px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24", flexShrink: 0 }}
      />
      {item.content}
    </div>
  );
}
