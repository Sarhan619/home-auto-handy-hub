import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { STATUS_LABEL, STATUS_VARIANT, ACTIVE_STATUSES, type BookingStatus } from "@/lib/booking";
import { Clock } from "lucide-react";

type Row = {
  id: string;
  status: BookingStatus;
  job_address: string;
  created_at: string;
  service_categories: { name: string; slug: string } | null;
  vendors: { business_name: string } | null;
};

export default function MyBookings() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!user) return;
    supabase
      .from("bookings")
      .select("id,status,job_address,created_at,service_categories(name,slug),vendors(business_name)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows((data as unknown as Row[]) ?? []);
        setLoading(false);
      });
  };

  useEffect(load, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`customer-bookings-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `customer_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const active = rows.filter((r) => ACTIVE_STATUSES.includes(r.status));
  const past = rows.filter((r) => !ACTIVE_STATUSES.includes(r.status));

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SiteHeader />
      <main className="container py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Customer</p>
            <h1 className="text-3xl font-bold tracking-tight">My bookings</h1>
          </div>
          <Button asChild><Link to="/services">Book another</Link></Button>
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No bookings yet. <Link to="/services" className="font-medium text-primary">Find a pro</Link>.</CardContent></Card>
        ) : (
          <div className="space-y-8">
            <Section title="Active" rows={active} />
            <Section title="History" rows={past} />
          </div>
        )}
      </main>
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{title}</h2>
      <div className="space-y-3">
        {rows.map((r) => (
          <Link key={r.id} to={`/bookings/${r.id}`}>
            <Card className="shadow-card transition-shadow hover:shadow-elegant">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{r.service_categories?.name ?? "Service"}</p>
                    <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{r.job_address}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.vendors?.business_name ? `Vendor: ${r.vendors.business_name}` : "Awaiting vendor"}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {new Date(r.created_at).toLocaleString()}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}