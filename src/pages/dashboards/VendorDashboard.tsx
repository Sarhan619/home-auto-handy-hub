import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, DollarSign, Star, TrendingUp, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AvailabilityToggle from "@/components/AvailabilityToggle";

type VendorRow = {
  id: string;
  business_name: string;
  verification_status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  total_jobs: number;
  avg_rating: number | null;
  is_online: boolean;
};

const statusVariant = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
} as const;

export default function VendorDashboard() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<VendorRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("vendors")
      .select("id,business_name,verification_status,rejection_reason,total_jobs,avg_rating,is_online")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setVendor((data as VendorRow) ?? null);
        setLoading(false);
      });
  }, [user]);

  const stats = [
    { label: "Active jobs", value: "0", icon: Briefcase },
    { label: "This month", value: "$0", icon: DollarSign },
    { label: "Rating", value: vendor?.avg_rating ? vendor.avg_rating.toFixed(1) : "—", icon: Star },
    { label: "Total jobs", value: vendor?.total_jobs ?? 0, icon: TrendingUp },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <SiteHeader />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SiteHeader />
      <main className="container py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-accent">Vendor</p>
            <h1 className="text-3xl font-bold tracking-tight">
              {vendor?.business_name ?? "Vendor dashboard"}
            </h1>
            <p className="mt-1 text-muted-foreground">Manage jobs, availability, and earnings.</p>
          </div>
          {vendor && (
            <Badge variant={statusVariant[vendor.verification_status]} className="capitalize">
              {vendor.verification_status}
            </Badge>
          )}
        </div>

        {!vendor && (
          <Card className="mb-6 border-accent/40 bg-accent/5">
            <CardContent className="flex items-center justify-between gap-4 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-accent" />
                <div>
                  <p className="font-medium">Finish setting up your business</p>
                  <p className="text-sm text-muted-foreground">Complete onboarding to start receiving jobs.</p>
                </div>
              </div>
              <Button asChild variant="accent"><Link to="/vendor/onboarding">Get started</Link></Button>
            </CardContent>
          </Card>
        )}

        {vendor?.verification_status === "pending" && (
          <Card className="mb-6 border-secondary bg-secondary/40">
            <CardContent className="p-5 text-sm">
              <span className="font-medium">Application under review.</span>{" "}
              <span className="text-muted-foreground">We'll notify you once an admin approves your business.</span>
            </CardContent>
          </Card>
        )}

        {vendor?.verification_status === "rejected" && (
          <Card className="mb-6 border-destructive/40 bg-destructive/5">
            <CardContent className="space-y-2 p-5 text-sm">
              <p><span className="font-medium text-destructive">Application rejected.</span></p>
              {vendor.rejection_reason && <p className="text-muted-foreground">Reason: {vendor.rejection_reason}</p>}
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link to="/vendor/onboarding">Update & resubmit</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {vendor?.verification_status === "approved" && (
          <Card className="mb-6 border-success/40 bg-success/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5 text-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="font-medium">You're verified — toggle availability to receive jobs.</span>
              </div>
              <AvailabilityToggle
                vendorId={vendor.id}
                initialOnline={vendor.is_online}
                onChange={(o) => setVendor((v) => (v ? { ...v, is_online: o } : v))}
              />
            </CardContent>
          </Card>
        )}

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
            <CardHeader><CardTitle>Job requests</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {vendor?.verification_status === "approved"
                  ? "View open requests in your service area and your active jobs."
                  : "Once you're approved, open requests will show up here."}
              </p>
              <Button asChild disabled={vendor?.verification_status !== "approved"}>
                <Link to="/vendor/jobs">Open jobs board</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Business profile</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {vendor ? "Keep your details up to date." : "Complete your profile to get verified."}
              </p>
              <Button asChild variant="outline" className="mt-3">
                <Link to="/vendor/onboarding">{vendor ? "Edit profile" : "Start onboarding"}</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
