import SiteHeader from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, DollarSign, Star, TrendingUp } from "lucide-react";

const stats = [
  { label: "Active jobs", value: "0", icon: Briefcase },
  { label: "This month", value: "$0", icon: DollarSign },
  { label: "Rating", value: "—", icon: Star },
  { label: "Completion", value: "—", icon: TrendingUp },
];

export default function VendorDashboard() {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SiteHeader />
      <main className="container py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-accent">Vendor</p>
            <h1 className="text-3xl font-bold tracking-tight">Vendor dashboard</h1>
            <p className="mt-1 text-muted-foreground">Manage jobs, availability, and earnings.</p>
          </div>
          <Badge variant="secondary" className="text-xs">Verification: pending</Badge>
        </div>

        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="shadow-card">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold">{value}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Nearby job requests</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No open requests in your service area.</p>
              <Button variant="accent" className="mt-4">Set availability</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Complete your profile</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">Get verified faster:</p>
              <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
                <li>Add business details and service categories</li>
                <li>Upload license / insurance documents</li>
                <li>Connect payouts</li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
