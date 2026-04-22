import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { STATUS_LABEL, STATUS_VARIANT, VENDOR_NEXT, VENDOR_NEXT_LABEL, ACTIVE_STATUSES, type BookingStatus } from "@/lib/booking";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Calendar, FileText, Loader2, X, Truck, Phone, User } from "lucide-react";
import ReviewSection from "@/components/ReviewSection";
import CompleteJobDialog from "@/components/CompleteJobDialog";
import { PAYMENT_METHOD_LABEL, formatCurrency } from "@/lib/payment";
import type { Database } from "@/integrations/supabase/types";

type Booking = {
  id: string;
  customer_id: string;
  vendor_id: string | null;
  category_id: string;
  status: BookingStatus;
  dispatch_mode: "broadcast" | "direct";
  job_address: string;
  job_lat: number;
  job_lng: number;
  notes: string | null;
  scheduled_for: string | null;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  quoted_price: number | null;
  final_price: number | null;
  price_adjustment_note: string | null;
  commission_pct: number | null;
  payment_method: Database["public"]["Enums"]["payment_method"] | null;
  is_paid: boolean;
  paid_at: string | null;
  service_categories: { name: string; slug: string } | null;
  vendors: { id: string; business_name: string; phone: string | null; user_id: string } | null;
};

const TIMELINE: { key: BookingStatus; label: string }[] = [
  { key: "requested", label: "Requested" },
  { key: "accepted", label: "Accepted" },
  { key: "en_route", label: "On the way" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
];

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const load = () => {
    if (!id) return;
    supabase
      .from("bookings")
      .select("*,service_categories(name,slug),vendors(id,business_name,phone,user_id)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setBooking((data as unknown as Booking) ?? null);
        setLoading(false);
      });
  };

  useEffect(load, [id]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`booking-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `id=eq.${id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <SiteHeader />
        <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <SiteHeader />
        <main className="container py-10"><p className="text-sm text-muted-foreground">Booking not found.</p></main>
      </div>
    );
  }

  const isCustomer = user?.id === booking.customer_id;
  const isAssignedVendor = !!booking.vendors && booking.vendors.user_id === user?.id;
  const canCancel = isCustomer && ACTIVE_STATUSES.includes(booking.status) && booking.status !== "in_progress";
  const vendorNext = isAssignedVendor ? VENDOR_NEXT[booking.status] : undefined;

  const advance = async (next: BookingStatus) => {
    if (next === "completed") {
      setCompleteOpen(true);
      return;
    }
    setActing(true);
    const { error } = await supabase.from("bookings").update({ status: next }).eq("id", booking.id);
    setActing(false);
    if (error) toast.error(error.message);
    else toast.success(`Updated to ${STATUS_LABEL[next]}`);
  };

  const cancel = async () => {
    const reason = window.prompt("Optional reason for cancelling?") ?? null;
    setActing(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled", cancel_reason: reason })
      .eq("id", booking.id);
    setActing(false);
    if (error) toast.error(error.message);
    else toast.success("Booking cancelled");
  };

  const decline = async () => {
    setActing(true);
    const { error } = await supabase.from("bookings").update({ status: "declined" }).eq("id", booking.id);
    setActing(false);
    if (error) toast.error(error.message);
    else toast.success("Job declined");
  };

  const currentStep = TIMELINE.findIndex((s) => s.key === booking.status);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SiteHeader />
      <main className="container max-w-3xl py-10">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 -ml-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Booking</p>
            <h1 className="text-3xl font-bold tracking-tight">{booking.service_categories?.name ?? "Service"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Created {new Date(booking.created_at).toLocaleString()}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[booking.status]} className="text-sm">{STATUS_LABEL[booking.status]}</Badge>
        </div>

        {!ACTIVE_STATUSES.includes(booking.status) || booking.status === "requested" ? null : (
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Progress</CardTitle></CardHeader>
            <CardContent>
              <ol className="grid grid-cols-5 gap-2">
                {TIMELINE.map((step, idx) => {
                  const done = idx <= currentStep;
                  return (
                    <li key={step.key} className="flex flex-col items-center text-center">
                      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {idx + 1}
                      </div>
                      <span className={`text-[11px] ${done ? "font-medium" : "text-muted-foreground"}`}>{step.label}</span>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm font-medium">{booking.job_address}</p>
                <p className="text-xs text-muted-foreground">{Number(booking.job_lat).toFixed(4)}, {Number(booking.job_lng).toFixed(4)}</p>
              </div>
            </div>
            {booking.scheduled_for && (
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Preferred time</p>
                  <p className="text-sm font-medium">{new Date(booking.scheduled_for).toLocaleString()}</p>
                </div>
              </div>
            )}
            {booking.notes && (
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{booking.notes}</p>
                </div>
              </div>
            )}
            <Separator />
            {!isCustomer && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Customer name</p>
                      <p className="text-sm font-medium">{booking.customer_name ?? "Not provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Customer phone</p>
                      <p className="text-sm font-medium">{booking.customer_phone ?? "Not provided"}</p>
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{isCustomer ? "Vendor" : "Customer"}</p>
                <p className="text-sm font-medium">
                  {isCustomer
                    ? booking.vendors?.business_name ?? (booking.dispatch_mode === "broadcast" ? "Awaiting vendor (broadcast)" : "Pending")
                    : "Customer"}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">{booking.dispatch_mode}</Badge>
            </div>
          </CardContent>
        </Card>

        {(booking.quoted_price != null || booking.final_price != null) && (
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Payment</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {booking.quoted_price != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quoted price</span>
                  <span className="font-medium">{formatCurrency(booking.quoted_price)}</span>
                </div>
              )}
              {booking.final_price != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Final price</span>
                  <span className="font-medium">{formatCurrency(booking.final_price)}</span>
                </div>
              )}
              {booking.payment_method && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="font-medium">{PAYMENT_METHOD_LABEL[booking.payment_method]}</span>
                </div>
              )}
              {booking.is_paid && (
                <Badge variant="default" className="mt-1">Paid offline</Badge>
              )}
              {booking.price_adjustment_note && (
                <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Adjustment note:</span> {booking.price_adjustment_note}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          {isAssignedVendor && vendorNext && (
            <Button onClick={() => advance(vendorNext)} disabled={acting}>
              <Truck className="mr-2 h-4 w-4" /> {VENDOR_NEXT_LABEL[booking.status]}
            </Button>
          )}
          {isAssignedVendor && booking.status === "accepted" && (
            <Button variant="outline" onClick={decline} disabled={acting}>Cancel job</Button>
          )}
          {canCancel && (
            <Button variant="outline" onClick={cancel} disabled={acting}>
              <X className="mr-2 h-4 w-4" /> Cancel booking
            </Button>
          )}
        </div>

        {booking.cancel_reason && (
          <p className="mt-3 text-xs text-muted-foreground">Cancellation reason: {booking.cancel_reason}</p>
        )}

        {booking.status === "completed" && booking.vendor_id && (
          <div className="mt-6">
            <ReviewSection
              bookingId={booking.id}
              vendorId={booking.vendor_id}
              customerId={booking.customer_id}
            />
          </div>
        )}

        <CompleteJobDialog
          open={completeOpen}
          onOpenChange={setCompleteOpen}
          bookingId={booking.id}
          quotedPrice={booking.quoted_price}
          commissionPct={booking.commission_pct}
          onCompleted={load}
        />
      </main>
    </div>
  );
}