import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { iconForCategory } from "@/lib/categoryIcons";
import { STATUS_LABEL, STATUS_VARIANT, ACTIVE_STATUSES, type BookingStatus } from "@/lib/booking";

type Cat = { id: string; name: string; slug: string };
type ActiveBooking = {
  id: string;
  status: BookingStatus;
  job_address: string;
  service_categories: { name: string } | null;
};

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Cat[]>([]);
  const [active, setActive] = useState<ActiveBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("service_categories").select("id,name,slug").eq("is_active", true).order("name").limit(6),
      supabase
        .from("bookings")
        .select("id,status,job_address,service_categories(name)")
        .eq("customer_id", user.id)
        .in("status", ACTIVE_STATUSES)
        .order("created_at", { ascending: false }),
    ]).then(([cats, bks]) => {
      setCategories((cats.data as Cat[]) ?? []);
      setActive((bks.data as unknown as ActiveBooking[]) ?? []);
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SiteHeader />
      <main className="container py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">Customer</p>
          <h1 className="text-3xl font-bold tracking-tight">Welcome{user?.email ? , ${user.email.split("@")[0]} : ""}</h1>
          <p className="mt-1 text-muted-foreground">Find trusted local pros for any home or auto job.</p>
        </div>

        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Browse services</h2>
            <Button asChild variant="link" className="px-0"><Link to="/services">See all</Link></Button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)
              : categories.map((cat) => {
                  const Icon = iconForCategory(cat.slug);
                  return (
                    <Link key={cat.id} to={/services/${cat.slug}}>
                      <Card className="cursor-pointer shadow-card transition-[var(--transition-smooth)] hover:-translate-y-1 hover:shadow-elegant">
                        <CardContent className="flex flex-col items-center gap-3 p-6">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-center">{cat.name}</span>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Active bookings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {active.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active bookings. Pick a service above to get started.</p>
              ) : (
                active.slice(0, 4).map((b) => (
                  <Link key={b.id} to={/bookings/${b.id}} className="block">
                    <div className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{b.service_categories?.name ?? "Service"}</p>
                        <p className="truncate text-xs text-muted-foreground">{b.job_address}</p>
                      </div>
                      <Badge variant={STATUS_VARIANT[b.status]}>{STATUS_LABEL[b.status]}</Badge>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Your booking history will appear here.</p>
              <Button asChild variant="link" className="mt-2 px-0"><Link to="/bookings">View all</Link></Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
