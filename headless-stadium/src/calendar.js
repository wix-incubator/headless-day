// ---------------------------------------------------------------------------
// "Add to calendar" links, built from the headless event data. Works for both
// the simulated event and a live Wix Event (data.js merges startsAt/endsAt).
// ---------------------------------------------------------------------------

function utcStamp(iso) {
  // 2026-07-19T18:00:00-04:00 -> 20260719T220000Z
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function eventFields(event) {
  return {
    title: `${event.home.name} vs ${event.away.name} — ${event.competition}`,
    details: `Seat preview & tickets: ${window.location.origin}`,
    location: event.venue,
    start: utcStamp(event.startsAt),
    end: utcStamp(event.endsAt ?? new Date(new Date(event.startsAt).getTime() + 2 * 3600e3).toISOString()),
  };
}

export function googleCalendarUrl(event) {
  const f = eventFields(event);
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: f.title,
    dates: `${f.start}/${f.end}`,
    details: f.details,
    location: f.location,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

// Downloads a .ics file (Apple Calendar, Outlook, …).
export function downloadIcs(event) {
  const f = eventFields(event);
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Headless Stadium//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@headless-stadium`,
    `DTSTAMP:${f.start}`,
    `DTSTART:${f.start}`,
    `DTEND:${f.end}`,
    `SUMMARY:${f.title}`,
    `DESCRIPTION:${f.details}`,
    `LOCATION:${f.location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'world-cup-2026-final.ics';
  a.click();
  URL.revokeObjectURL(url);
}
