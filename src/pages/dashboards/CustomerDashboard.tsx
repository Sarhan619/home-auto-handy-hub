import SiteHeader from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Car, Droplets, Trees, Truck, Home as HomeIcon, Wrench } from "lucide-react";

const services = [
  { icon: Droplets, label: "Car Wash" },
  { icon: Trees, label: "Lawn Care" },
  { icon: Truck, label: "Towing" },
  { icon: HomeIcon, label: "Roofing" },
  { icon: Car, label: "Auto Repair" },
  { icon: Wrench, label: "Handyman" },
];

export default function CustomerDashboard() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SiteHeader />
      <main className="container py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">Customer</p>
          <h1 className="text-3xl font-bold tracking-tight">Welcome{user?.email ? `, ${user.email.split("@")[0]}` : ""}</h1>
          <p className="mt-1 text-muted-foreground">Find trusted local pros for any home or auto job.</p>
        </div>

        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">Browse services</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {services.map(({ icon: Icon, label }) => (
              <Card key={label} className="cursor-pointer shadow-card transition-[var(--transition-smooth)] hover:-translate-y-1 hover:shadow-elegant">
                <CardContent className="flex flex-col items-center gap-3 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Active bookings</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No active bookings yet. Pick a service above to get started.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Your booking history will appear here.</p>
              <Button variant="link" className="mt-2 px-0">View all</Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
