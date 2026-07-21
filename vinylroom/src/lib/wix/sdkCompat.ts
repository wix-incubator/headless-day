type EventsCompat = {
  queryEvents: (options?: { fields?: string[] }) => {
    limit: (value: number) => {
      find: () => Promise<{ items?: unknown[] }>;
    };
  };
};

type RedirectsCompat = {
  createRedirectSession: (options: {
    eventsCheckout: { eventSlug: string; reservationId: string };
    callbacks: { thankYouPageUrl: string; postFlowUrl: string };
  }) => Promise<{ redirectSession?: { fullUrl?: string } }>;
};

/** Bridges methods present in the Wix runtime while aggregate generated typings catch up. */
export function eventsCompat(value: unknown) {
  return value as EventsCompat;
}

export function redirectsCompat(value: unknown) {
  return value as RedirectsCompat;
}
