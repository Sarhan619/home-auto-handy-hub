import { useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/payment";
import { Receipt, CheckCheck } from "lucide-react";

type Row = {
  id: string;
  booking_id: string;
  vendor_id: string;
  gross_amount: number;
  commission_pct: number;
  commission_amount: number;
  vendor_net: number;
  status: "owed" | "settled";
  created_at: string;
  settled_at: string | null;
  vendors: { business_name: string } | null;
};

export default function AdminCommissions() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"owed" | "settled">("owed");
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    setSelected(new Set());
    const { data, error } = await supabase
      .from("commissions")
      .select("*,vendors(business_name)")
      .eq("status", tab)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as unknown as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  const settle = async () => {
    if (selected.size === 0) return;
    setActing(true);
    const { error } = await supabase
      .from("commissions")
      .update({ status: "settled", settled_at: new Date().toISOString(), settled_by: user?.id })
      .in("id", Array.from(selected));
    setActing(false);
    if (error) return toast.error(error.message);
    toast.success(`${selected.size} commission${selected.size === 1 ? "" : "s"} marked as settled`);
    load();
  };

  const totalOwed = rows.reduce((sum, r) => sum + Number(r.commission_amount), 0);
  const selectedTotal = rows
    .filter((r) => selected.has(r.id))
    .reduce((sum, r) => sum + Number(r.commission_amount), 0);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SiteHeader />
      <main className="container max-w-5xl py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-destructive">Admin</p>
            <h1 className="text-3xl font-bold tracking-tight">Commissions ledger</h1>
            <p className="mt-1 text-sm text-muted-foreground">Track and settle commission owed by vendors.</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Receipt className="h-6 w-6 text-primary" />
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "owed" | "settled")} className="mb-4">
          <TabsList>
            <TabsTrigger value="owed">Owed</TabsTrigger>
            <TabsTrigger value="settled">Settled</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              {tab === "owed" ? "Awaiting settlement" : "Settled commissions"}
              {!loading && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  Total {formatCurrency(totalOwed)}
                </span>
              )}
            </CardTitle>
            {tab === "owed" && selected.size > 0 && (
              <Button onClick={settle} disabled={acting} size="sm">
                <CheckCheck className="mr-1 h-4 w-4" />
                Settle {selected.size} ({formatCurrency(selectedTotal)})
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {tab === "owed" ? "No outstanding commissions." : "No settled commissions yet."}
              </p>
            ) : (
              <div className="space-y-1">
                {tab === "owed" && (
                  <div className="flex items-center gap-3 border-b py-2 text-xs text-muted-foreground">
                    <Checkbox checked={selected.size === rows.length && rows.length > 0} onCheckedChange={toggleAll} />
                    <span>Select all</span>
                  </div>
                )}
                {rows.map((r) => (
                  <div key={r.id} className="grid grid-cols-12 items-center gap-3 py-3 border-b last:border-0">
                    {tab === "owed" && (
                      <div className="col-span-1">
                        <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                      </div>
                    )}
                    <div className={tab === "owed" ? "col-span-5 sm:col-span-4" : "col-span-6 sm:col-span-5"}>
                      <p className="text-sm font-medium truncate">{r.vendors?.business_name ?? "Vendor"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="col-span-3 sm:col-span-2 text-right text-sm">{formatCurrency(r.gross_amount)}</div>
                    <div className="col-span-3 sm:col-span-2 text-right text-sm font-semibold text-destructive">
                      {formatCurrency(r.commission_amount)}
                    </div>
                    <div className="col-span-12 sm:col-span-3 sm:text-right">
                      <Badge variant={r.status === "settled" ? "outline" : "secondary"}>
                        {r.status === "settled"
                          ? `Settled ${r.settled_at ? new Date(r.settled_at).toLocaleDateString() : ""}`
                          : `${r.commission_pct}% commission`}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}