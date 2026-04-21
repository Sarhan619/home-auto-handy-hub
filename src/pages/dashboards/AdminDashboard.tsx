import SiteHeader from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Store, Receipt, ShieldAlert } from "lucide-react";

const tiles = [
  { label: "Customers", value: "0", icon: Users },
  { label: "Vendors", value: "0", icon: Store },
  { label: "Transactions", value: "0", icon: Receipt },
  { label: "Open disputes", value: "0", icon: ShieldAlert },
];

export default function AdminDashboard() {
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
          <CardHeader><CardTitle>Vendor approval queue</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No vendors awaiting verification.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
