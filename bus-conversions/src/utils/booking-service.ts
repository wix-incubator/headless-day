import { services, availabilityCalendar, bookings } from "@wix/bookings";
import { checkout } from "@wix/ecom";
import { redirects } from "@wix/redirects";
import { BOOKINGS_APP_ID, TIME_FORMAT } from "./constants";
import { formatDisplayDate } from "./date-utils";

export interface BookingData {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes?: string;
  date?: string;
  time?: string;
  displayDate?: string;
  displayTime?: string;
  // open-build tour extras (our metadata; stored for the confirmation page)
  partySize?: string;
  buildLevel?: string;
  config?: string;
}

export interface TourSlot {
  start: string;
  displayDate: string;
  displayTime: string;
  weekday: string;
  isSaturday: boolean;
  entity: any;
}

const PORTLAND_TZ = "America/Los_Angeles";

export interface TimeSlot {
  time: string;
  display: string;
  available: boolean;
  entity: any;
}

interface WixService {
  _id: string;
  name: string;
  [key: string]: any;
}

interface WixBookingResponse {
  [key: string]: any;
}

interface WixRedirectResponse {
  redirectSession?: {
    fullUrl?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export async function getServices(): Promise<WixService[]> {
  try {
    const { items } = await services.queryServices().find();
    return items as WixService[];
  } catch (error) {
    console.error("Error fetching services:", error);
    throw error;
  }
}

export async function getServiceByType(
  type: "free" | "premium"
): Promise<WixService | undefined> {
  try {
    const services = await getServices();

    return type === "free"
      ? services.find((s) => s.payment.rateType === "NO_FEE")
      : services.find((s) => s.payment.rateType === "FIXED");
  } catch (error) {
    console.error(`Error finding ${type} service:`, error);
    throw error;
  }
}

export async function getAvailableSlots(
  date: Date,
  serviceType: "free" | "premium"
): Promise<TimeSlot[]> {
  try {
    const service = await getServiceByType(serviceType);

    if (!service) {
      throw new Error(`No ${serviceType} service found`);
    }

    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const availability = await availabilityCalendar.queryAvailability(
      {
        filter: {
          serviceId: [service._id],
          startDate: date.toISOString(),
          endDate: tomorrow.toISOString(),
        },
      },
      { timezone: "UTC" }
    );

    return availability.availabilityEntries.map((item) => ({
      time: item.slot?.startDate!,
      display: Intl.DateTimeFormat("en-US", TIME_FORMAT).format(
        new Date(item.slot?.startDate!)
      ),
      available: item.bookable!,
      entity: item,
    }));
  } catch (error) {
    console.error("Error fetching available slots:", error);
    return [];
  }
}

/**
 * Live open-build tour slots from Wix Bookings. Queries real
 * availability for the free tour service over the next ~6 weeks.
 * Prefers Saturdays (the shop's open-build day); if the service has
 * no Saturday hours set yet, falls back to the soonest available
 * tour times so the flow always works. Times shown in Portland time.
 */
export async function getUpcomingTourSlots(limit = 8): Promise<TourSlot[]> {
  const service = await getServiceByType("free");
  if (!service) return [];

  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 42);

  const availability = await availabilityCalendar.queryAvailability(
    {
      filter: {
        serviceId: [service._id],
        startDate: now.toISOString(),
        endDate: end.toISOString(),
      },
    },
    { timezone: PORTLAND_TZ }
  );

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: PORTLAND_TZ,
  });
  const timeFmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: PORTLAND_TZ,
  });

  const all: TourSlot[] = (availability.availabilityEntries ?? [])
    .filter((e) => e.bookable && e.slot?.startDate)
    .map((e) => {
      const start = e.slot!.startDate!;
      const d = new Date(start);
      const localDow = new Date(
        d.toLocaleString("en-US", { timeZone: PORTLAND_TZ })
      ).getDay();
      return {
        start,
        displayDate: dateFmt.format(d),
        displayTime: timeFmt.format(d),
        weekday: days[localDow],
        isSaturday: localDow === 6,
        entity: e,
      };
    })
    .sort((a, b) => +new Date(a.start) - +new Date(b.start));

  const saturdays = all.filter((s) => s.isSaturday);
  const pool = saturdays.length ? saturdays : all;
  return pool.slice(0, limit);
}

export async function createBooking(
  bookingData: BookingData,
  selectedSlot: TimeSlot | TourSlot,
  selectedDate: Date
): Promise<WixBookingResponse> {
  try {
    const [firstName, ...lastNameParts] = bookingData.name.split(" ");
    const lastName = lastNameParts.join(" ");

    const booking = await bookings.createBooking({
      bookedEntity: selectedSlot.entity,
      totalParticipants: 1,
      contactDetails: {
        firstName,
        lastName,
        fullAddress: {
          addressLine: bookingData.address,
        },
        email: bookingData.email,
        phone: bookingData.phone,
      },
    });

    const createdCheckout = await checkout.createCheckout({
      lineItems: [
        {
          quantity: 1,
          catalogReference: {
            appId: BOOKINGS_APP_ID,
            catalogItemId: booking.booking!._id!,
          },
        },
      ],
      channelType: checkout.ChannelType.WEB,
      checkoutInfo: {
        billingInfo: {
          contactDetails: {
            firstName: firstName,
            lastName: lastName,
            phone: bookingData.phone,
          },
        },
        buyerInfo: {
          email: bookingData.email,
        },
      },
    });

    await checkout.createOrder(createdCheckout._id!);

    // Prepare data for confirmation page (supports both slot shapes)
    const anySlot = selectedSlot as any;
    const confirmationData = {
      ...bookingData,
      date: selectedDate.toISOString().split("T")[0], // yyyy-MM-dd format
      time: anySlot.time ?? anySlot.start,
      displayDate: anySlot.displayDate ?? formatDisplayDate(selectedDate),
      displayTime: anySlot.displayTime ?? anySlot.display,
    };

    // Save to session storage
    sessionStorage.setItem("bookingData", JSON.stringify(confirmationData));

    return booking;
  } catch (error) {
    console.error("Error creating booking:", error);
    throw error;
  }
}

export async function createRedirectSession(
  slot: any,
  returnUrl: string
): Promise<string | undefined> {
  try {
    const redirect: WixRedirectResponse = await redirects.createRedirectSession(
      {
        bookingsCheckout: {
          slotAvailability: slot,
          timezone: "UTC",
        },
        callbacks: {
          postFlowUrl: returnUrl,
        },
      }
    );

    return redirect.redirectSession?.fullUrl;
  } catch (error) {
    console.error("Error creating redirect session:", error);
    throw error;
  }
}
