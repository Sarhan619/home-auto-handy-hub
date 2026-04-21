import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/payment";
import { ArrowLeft, DollarSign, Wallet, Receipt } from "lucide-react";

type CommissionRow = {
  id: string;
  booking_id: string;
  gross_amount: number;
  commission_pct: number;
  commission_amount: number;
  vendor_net: number;
  status: "owed" | "settled";
  created_at: string;
  settled_at: string | null;
};

export default function VendorEarnings() {
  const { user } = useAuth();
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: vendor } = await supabase.from("vendors").select("id").eq("user_id", user.id).maybeSingle();
      if (!vendor) { setLoading(false); return; }
      const { data } = await supabase
        .from("commissions")
        .select("id,booking_id,gross_amount,commission_pct,commission_amount,vendor_net,status,created_at,settled_at")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });
      setRows((data as CommissionRow[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const totals = rows.reduce(
    (acc, r) => {
      acc.gross += Number(r.gross_amount);
      acc.net += Number(r.vendor_net);
      if (r.status === "owed") acc.owed += Number(r.commission_amount);
      else acc.settled += Number(r.commission_amount);
      return acc;
    },
    { gross: 0, net: 0, owed: 0, settled: 0 }
  );

  const stats = [
    { label: "Gross collected", value: formatCurrency(totals.gross), icon: DollarSign },
    { label: "Your net", value: formatCurrency(totals.net), icon: Wallet },
    { label: "Commission owed", value: formatCurrency(totals.owed), icon: Receipt, accent: true },
    { label: "Commission settled", value: formatCurrency(totals.settled), icon: Receipt },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SiteHeader />
      <main className="container max-w-4xl py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/vendor"><ArrowLeft className="mr-1 h-4 w-4" /> Dashboard</Link>
        </Button>

        <div className="mb-6">
          <p className="text-sm font-medium text-accent">Vendor</p>
          <h1 className="text-3xl font-bold tracking-tight">Earnings & commissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Money you've collected and what you owe the platform.</p>
        </div>

        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, accent }) => (
            <Card key={label} className="shadow-card">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`mt-1 text-xl font-bold ${accent ? "text-destructive" : ""}`}>{value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent ? "bg-destructive/10" : "bg-accent/15"}`}>
                  <Icon className={`h-5 w-5 ${accent ? "text-destructive" : "text-accent"}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card>
          <CardHeader><CardTitle className="text-base">Completed jobs</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No completed jobs yet.</p>
            ) : (
              <div className="divide-y">
                {rows.map((r) => (
                  <Link to={`/bookings/${r.booking_id}`} key={r.id} className="grid grid-cols-12 items-center gap-3 py-3 hover:bg-muted/30 -mx-2 px-2 rounded">
                    <div className="col-span-5 sm:col-span-4">
                      <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                      <p className="text-sm font-medium">Booking</p>
                    </div>
                    <div className="col-span-3 sm:col-span-2 text-right text-sm">{formatCurrency(r.gross_amount)}</div>
                    <div className="col-span-2 text-right text-sm text-destructive">−{formatCurrency(r.commission_amount)}</div>
                    <div className="col-span-2 text-right text-sm font-semibold">{formatCurrency(r.vendor_net)}</div>
                    <div className="col-span-12 sm:col-span-2 sm:text-right">
                      <Badge variant={r.status === "settled" ? "outline" : "secondary"}>
                        {r.status === "settled" ? "Settled" : "Owed"}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}