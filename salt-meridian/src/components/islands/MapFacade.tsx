import { useState } from 'react';

type Props = {
  lat: number;
  lng: number;
  label: string;
};

/**
 * Map facade: ships as a lightweight static panel and only swaps in the
 * interactive OpenStreetMap iframe on click — keeps the third-party embed off
 * the critical path. No API key required.
 */
export default function MapFacade({ lat, lng, label }: Props) {
  const [live, setLive] = useState(false);
  const d = 0.008;
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  const fullUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

  if (live) {
    return (
      <div className="map-frame">
        <iframe
          title={`Map showing ${label}`}
          src={src}
          loading="lazy"
          width="100%"
          height="100%"
          style={{ border: 0 }}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className="map-facade"
      onClick={() => setLive(true)}
      aria-label={`Load interactive map of ${label}`}
    >
      <span className="map-grid" aria-hidden="true" />
      <span className="map-pin" aria-hidden="true" />
      <span className="map-cta">
        <span>{label}</span>
        <span className="map-cta-action">Tap to open the map →</span>
      </span>
      <a
        href={fullUrl}
        target="_blank"
        rel="noreferrer"
        className="map-directions"
        onClick={(e) => e.stopPropagation()}
      >
        Directions
      </a>
    </button>
  );
}
