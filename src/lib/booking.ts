import type { Database } from "@/integrations/supabase/types";

export type BookingStatus = Database["public"]["Enums"]["booking_status"];

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: "Requested",
  accepted: "Accepted",
  en_route: "En route",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  declined: "Declined",
  expired: "Expired",
};

export const STATUS_VARIANT: Record<BookingStatus, "default" | "secondary" | "destructive" | "outline"> = {
  requested: "secondary",
  accepted: "default",
  en_route: "default",
  in_progress: "default",
  completed: "outline",
  cancelled: "destructive",
  declined: "destructive",
  expired: "destructive",
};

export const VENDOR_NEXT: Partial<Record<BookingStatus, BookingStatus>> = {
  accepted: "en_route",
  en_route: "in_progress",
  in_progress: "completed",
};

export const VENDOR_NEXT_LABEL: Partial<Record<BookingStatus, string>> = {
  accepted: "Mark on the way",
  en_route: "Start job",
  in_progress: "Complete job",
};

export const ACTIVE_STATUSES: BookingStatus[] = ["requested", "accepted", "en_route", "in_progress"];
export const TERMINAL_STATUSES: BookingStatus[] = ["completed", "cancelled", "declined", "expired"];