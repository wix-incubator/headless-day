export type AvailableTicket = {
  _id?: string;
  price?: { amount?: string; currency?: string };
  dashboard?: {
    quantity?: number | null;
    unsold?: number | null;
    ticketsSold?: number;
  };
};

type OrdersCompat = {
  queryAvailableTickets: (options: {
    filter: { eventId?: string };
    limit: number;
  }) => Promise<{ definitions?: AvailableTicket[] }>;
  createReservation: (
    eventId: string,
    options: { ticketQuantities: { ticketDefinitionId: string; quantity: number }[] },
  ) => Promise<{ _id?: string }>;
};

/** Temporary bridge for methods present at runtime but omitted by the generated aggregate SDK type. */
export function ordersCompat(value: unknown) {
  return value as OrdersCompat;
}
