// A cut-out watercolor stem (generated PNG with transparent background).
export default function StemImg({ id, height = 120 }: { id: string; height?: number }) {
  return (
    <img
      src={`/stems/${id}.png`}
      alt=""
      style={{ height, width: 'auto', display: 'block', userSelect: 'none' }}
      draggable={false}
      loading="lazy"
    />
  );
}
