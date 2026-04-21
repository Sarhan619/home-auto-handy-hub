import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Store, Receipt, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/payment";

export default function AdminDashboard() {
  const [pending, setPending] = useState<number>(0);
  const [vendorCount, setVendorCount] = useState<number>(0);
  const [commissionOwed, setCommissionOwed] = useState<number>(0);
  const [owedCount, setOwedCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const [{ count: pendingC }, { count: allC }, { data: owed }] = await Promise.all([
        supabase.from("vendors").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("vendors").select("id", { count: "exact", head: true }),
        supabase.from("commissions").select("commission_amount").eq("status", "owed"),
      ]);
      setPending(pendingC ?? 0);
      setVendorCount(allC ?? 0);
      const sum = (owed ?? []).reduce((s, r: { commission_amount: number }) => s + Number(r.commission_amount), 0);
      setCommissionOwed(sum);
      setOwedCount((owed ?? []).length);
    })();
  }, []);

  const tiles = [
    { label: "Customers", value: "—", icon: Users },
    { label: "Vendors", value: vendorCount, icon: Store },
    { label: "Commission owed", value: formatCurrency(commissionOwed), icon: Receipt },
    { label: "Pending approvals", value: pending, icon: ShieldAlert },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SiteHeader />
      <main className="container py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-destructive">Admin</p>
          <h1 className="text-3xl font-bold tracking-tight">Platform overview</h1>
          <p className="mt-1 text-muted-foreground">Manage commissions, vendors, and disputes.</p>
        </div>

        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tiles.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="shadow-card">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold">{value}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Vendor approval queue</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/vendors">Open queue</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {pending === 0 ? "No vendors awaiting verification." : `${pending} vendor${pending === 1 ? "" : "s"} awaiting verification.`}
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Commissions ledger</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/commissions">Open ledger</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {owedCount === 0
                ? "No outstanding commissions to settle."
                : `${owedCount} commission${owedCount === 1 ? "" : "s"} totaling ${formatCurrency(commissionOwed)} awaiting settlement.`}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
