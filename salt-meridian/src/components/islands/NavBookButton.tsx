/**
 * Primary reservation CTA in the header. Hydrated `client:load` so it is
 * interactive on first paint. Marks itself active when already on /reservations.
 */
export default function NavBookButton({ href = '/reservations' }: { href?: string }) {
  const onReservations =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/reservations');

  return (
    <a
      href={href}
      className="btn-primary btn-sm"
      aria-label="Request a table"
      aria-current={onReservations ? 'page' : undefined}
    >
      <span className="nav-book-full">Request a table</span>
      <span className="nav-book-short" aria-hidden="true">Book</span>
    </a>
  );
}
