import { useId } from "react";

interface LatestWordmarkProps {
  className?: string;
  height?: number;
  /** Pause the blinking cursor (e.g. in headers). */
  static?: boolean;
}

export function LatestWordmark({
  className,
  height = 28,
  static: isStatic,
}: LatestWordmarkProps) {
  const maskId = useId();
  const width = (height / 70) * 482;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 482 70"
      width={width}
      height={height}
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-label="@latest"
      style={{ color: "var(--lt-ink)" }}
    >
      <title>@latest</title>
      <defs>
        <mask id={maskId}>
          <rect width="482" height="70" fill="#fff" />
          {[8, 18, 28, 38, 48, 58, 68].map((y) => (
            <rect key={y} y={y} width="482" height="2" fill="#888" />
          ))}
        </mask>
        <style>{`
          @keyframes ltBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
          .lt-cursor { animation: ltBlink 1.06s step-end infinite; }
          @media (prefers-reduced-motion: reduce){ .lt-cursor{ animation:none } }
        `}</style>
      </defs>
      <g fill="currentColor" mask={`url(#${maskId})`}>
        <path d="M10 0h10v10h-10zM20 0h10v10h-10zM30 0h10v10h-10zM0 10h10v10h-10zM40 10h10v10h-10zM0 20h10v10h-10zM20 20h10v10h-10zM30 20h10v10h-10zM40 20h10v10h-10zM0 30h10v10h-10zM20 30h10v10h-10zM40 30h10v10h-10zM0 40h10v10h-10zM20 40h10v10h-10zM30 40h10v10h-10zM40 40h10v10h-10zM0 50h10v10h-10zM10 60h10v10h-10zM20 60h10v10h-10zM30 60h10v10h-10z" />
        <path d="M70 0h10v10h-10zM80 0h10v10h-10zM80 10h10v10h-10zM80 20h10v10h-10zM80 30h10v10h-10zM80 40h10v10h-10zM80 50h10v10h-10zM70 60h10v10h-10zM80 60h10v10h-10zM90 60h10v10h-10z" />
        <path d="M130 20h10v10h-10zM140 20h10v10h-10zM150 20h10v10h-10zM160 30h10v10h-10zM130 40h10v10h-10zM140 40h10v10h-10zM150 40h10v10h-10zM160 40h10v10h-10zM120 50h10v10h-10zM160 50h10v10h-10zM130 60h10v10h-10zM140 60h10v10h-10zM150 60h10v10h-10zM160 60h10v10h-10z" />
        <path d="M200 0h10v10h-10zM200 10h10v10h-10zM190 20h10v10h-10zM200 20h10v10h-10zM210 20h10v10h-10zM220 20h10v10h-10zM200 30h10v10h-10zM200 40h10v10h-10zM200 50h10v10h-10zM220 50h10v10h-10zM210 60h10v10h-10z" />
        <path d="M250 20h10v10h-10zM260 20h10v10h-10zM270 20h10v10h-10zM240 30h10v10h-10zM280 30h10v10h-10zM240 40h10v10h-10zM250 40h10v10h-10zM260 40h10v10h-10zM270 40h10v10h-10zM280 40h10v10h-10zM240 50h10v10h-10zM250 60h10v10h-10zM260 60h10v10h-10zM270 60h10v10h-10z" />
        <path d="M310 20h10v10h-10zM320 20h10v10h-10zM330 20h10v10h-10zM340 20h10v10h-10zM300 30h10v10h-10zM310 40h10v10h-10zM320 40h10v10h-10zM330 40h10v10h-10zM340 50h10v10h-10zM300 60h10v10h-10zM310 60h10v10h-10zM320 60h10v10h-10zM330 60h10v10h-10z" />
        <path d="M380 0h10v10h-10zM380 10h10v10h-10zM370 20h10v10h-10zM380 20h10v10h-10zM390 20h10v10h-10zM400 20h10v10h-10zM380 30h10v10h-10zM380 40h10v10h-10zM380 50h10v10h-10zM400 50h10v10h-10zM390 60h10v10h-10z" />
        <rect
          className={isStatic ? undefined : "lt-cursor"}
          x="430"
          y="0"
          width="26"
          height="70"
        />
      </g>
    </svg>
  );
}
