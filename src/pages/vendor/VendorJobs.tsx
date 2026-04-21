import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { STATUS_LABEL, STATUS_VARIANT, ACTIVE_STATUSES, type BookingStatus } from "@/lib/booking";
import { toast } from "sonner";
import { MapPin, Clock, Loader2, Zap } from "lucide-react";

type Booking = {
  id: string;
  status: BookingStatus;
  job_address: string;
  job_lat: number;
  job_lng: number;
  notes: string | null;
  created_at: string;
  dispatch_mode: "broadcast" | "direct";
  vendor_id: string | null;
  category_id: string;
  service_categories: { name: string } | null;
};

export default function VendorJobs() {
  const { user } = useAuth();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("vendors").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setVendorId((data as { id: string } | null)?.id ?? null));
  }, [user]);

  const load = () => {
    if (!user) return;
    setLoading(true);
    // RLS will return: assigned to this vendor + open broadcast jobs in vendor's categories
    supabase
      .from("bookings")
      .select("id,status,job_address,job_lat,job_lng,notes,created_at,dispatch_mode,vendor_id,category_id,service_categories(name)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setBookings((data as unknown as Booking[]) ?? []);
        setLoading(false);
      });
  };

  useEffect(load, [user, vendorId]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`vendor-bookings-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const acceptBroadcast = async (bookingId: string) => {
    setAccepting(bookingId);
    const { error } = await supabase.rpc("accept_broadcast_booking", { _booking_id: bookingId });
    setAccepting(null);
    if (error) toast.error(error.message);
    else toast.success("Job accepted!");
  };

  const acceptDirect = async (bookingId: string) => {
    setAccepting(bookingId);
    const { error } = await supabase.from("bookings").update({ status: "accepted" }).eq("id", bookingId);
    setAccepting(null);
    if (error) toast.error(error.message);
    else toast.success("Job accepted!");
  };

  const decline = async (bookingId: string) => {
    setAccepting(bookingId);
    const { error } = await supabase.from("bookings").update({ status: "declined" }).eq("id", bookingId);
    setAccepting(null);
    if (error) toast.error(error.message);
    else toast.success("Declined");
  };

  const open = bookings.filter(
    (b) => b.status === "requested" && (b.dispatch_mode === "broadcast" || b.vendor_id === vendorId)
  );
  const active = bookings.filter((b) => b.vendor_id === vendorId && ACTIVE_STATUSES.includes(b.status) && b.status !== "requested");
  const past = bookings.filter((b) => b.vendor_id === vendorId && !ACTIVE_STATUSES.includes(b.status));

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SiteHeader />
      <main className="container py-10">
        <div className="mb-6">
          <p className="text-sm font-medium text-accent">Vendor</p>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="mt-1 text-muted-foreground">Open requests and active jobs in your service area.</p>
        </div>

        <Tabs defaultValue="open">
          <TabsList>
            <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
            <TabsTrigger value="past">History ({past.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="mt-4 space-y-3">
            {loading
              ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28" />)
              : open.length === 0
              ? <Empty msg="No open requests right now." />
              : open.map((b) => (
                  <Card key={b.id} className="shadow-card">
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold">{b.service_categories?.name ?? "Service"}</p>
                          {b.dispatch_mode === "broadcast" && (
                            <Badge variant="secondary" className="text-[10px]"><Zap className="mr-1 h-3 w-3" />Broadcast</Badge>
                          )}
                          {b.dispatch_mode === "direct" && <Badge className="text-[10px]">Direct</Badge>}
                        </div>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {b.job_address}
                        </p>
                        {b.notes && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{b.notes}</p>}
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {new Date(b.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {b.dispatch_mode === "direct" && (
                          <Button variant="outline" size="sm" onClick={() => decline(b.id)} disabled={accepting === b.id}>
                            Decline
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => (b.dispatch_mode === "broadcast" ? acceptBroadcast(b.id) : acceptDirect(b.id))}
                          disabled={accepting === b.id}
                        >
                          {accepting === b.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Accept
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
          </TabsContent>

          <TabsContent value="active" className="mt-4 space-y-3">
            {active.length === 0 ? <Empty msg="No active jobs." /> : active.map((b) => <BookingRow key={b.id} b={b} />)}
          </TabsContent>

          <TabsContent value="past" className="mt-4 space-y-3">
            {past.length === 0 ? <Empty msg="No past jobs yet." /> : past.map((b) => <BookingRow key={b.id} b={b} />)}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function BookingRow({ b }: { b: Booking }) {
  return (
    <Link to={`/bookings/${b.id}`}>
      <Card className="shadow-card transition-shadow hover:shadow-elegant">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold">{b.service_categories?.name ?? "Service"}</p>
              <Badge variant={STATUS_VARIANT[b.status]}>{STATUS_LABEL[b.status]}</Badge>
            </div>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {b.job_address}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> {new Date(b.created_at).toLocaleString()}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

function Empty({ msg }: { msg: string }) {
  return <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">{msg}</CardContent></Card>;
}