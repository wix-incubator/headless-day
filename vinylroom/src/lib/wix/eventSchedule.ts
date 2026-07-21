export type EventSchedule = {
  day: string;
  dateLabel: string;
  time: string;
  startDate: string;
};

function eventStart(event: Record<string, unknown>) {
  const settings = (event.dateAndTimeSettings ?? event.scheduling) as Record<string, unknown> | undefined;
  const raw =
    settings?.startDate ??
    ((settings?.config as Record<string, unknown> | undefined)?.startDate as unknown);
  const value = raw instanceof Date ? raw.toISOString() : String(raw || "");
  const date = new Date(value);
  return { date, value, settings };
}

export function isUpcomingEvent(event: Record<string, unknown>) {
  const status = String(event.status || "").toUpperCase();
  if (status) return status === "UPCOMING";

  const { date } = eventStart(event);
  return !Number.isNaN(date.getTime()) && date.getTime() >= Date.now();
}

export function eventSchedule(event: Record<string, unknown>): EventSchedule | null {
  const { date, value, settings } = eventStart(event);
  if (Number.isNaN(date.getTime())) return null;

  const timeZone = typeof settings?.timeZoneId === "string" ? settings.timeZoneId : undefined;
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(timeZone ? { timeZone } : {}),
  };
  const dayOptions: Intl.DateTimeFormatOptions = {
    weekday: "short",
    ...(timeZone ? { timeZone } : {}),
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...(timeZone ? { timeZone } : {}),
  };

  return {
    day: date.toLocaleDateString("en-US", dayOptions),
    dateLabel: date.toLocaleDateString("en-US", dateOptions),
    time: date.toLocaleTimeString("en-GB", timeOptions),
    startDate: value,
  };
}
