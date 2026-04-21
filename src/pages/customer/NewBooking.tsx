import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import LocationPicker from "@/components/LocationPicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useJobLocation } from "@/hooks/useJobLocation";
import { toast } from "sonner";
import { Loader2, Zap, UserCheck } from "lucide-react";

type Category = { id: string; name: string };
type Vendor = { id: string; business_name: string };

export default function NewBooking() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { location } = useJobLocation();

  const categoryId = params.get("category");
  const vendorId = params.get("vendor");
  const mode = (params.get("mode") as "broadcast" | "direct") ?? (vendorId ? "direct" : "broadcast");
  const quotedPrice = params.get("price") ? Number(params.get("price")) : null;
  const priceType = (params.get("priceType") as "fixed" | "hourly" | "quote" | null) ?? null;

  const [category, setCategory] = useState<Category | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [notes, setNotes] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!categoryId) return;
    supabase.from("service_categories").select("id,name").eq("id", categoryId).maybeSingle()
      .then(({ data }) => setCategory(data as Category | null));
  }, [categoryId]);

  useEffect(() => {
    if (!vendorId) return;
    supabase.from("vendors").select("id,business_name").eq("id", vendorId).maybeSingle()
      .then(({ data }) => setVendor(data as Vendor | null));
  }, [vendorId]);

  const submit = async () => {
    if (!user || !categoryId) return;
    if (!location) {
      toast.error("Please set your job location.");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        customer_id: user.id,
        category_id: categoryId,
        vendor_id: mode === "direct" ? vendorId : null,
        dispatch_mode: mode,
        status: "requested",
        job_address: location.address,
        job_lat: location.lat,
        job_lng: location.lng,
        notes: notes.trim() || null,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        quoted_price: quotedPrice,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(mode === "broadcast" ? "Job broadcast to nearby pros!" : "Request sent to the vendor!");
    navigate(`/bookings/${data.id}`);
  };

  if (!categoryId) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <SiteHeader />
        <main className="container py-10">
          <p className="text-sm text-muted-foreground">No service selected.</p>
          <Button asChild className="mt-3"><Link to="/services">Browse services</Link></Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SiteHeader />
      <main className="container max-w-2xl py-10">
        <div className="mb-6">
          <p className="text-sm font-medium text-primary">New booking</p>
          <h1 className="text-3xl font-bold tracking-tight">{category?.name ?? "Service"}</h1>
        </div>

        <Card className="mb-6">
          <CardContent className="flex items-center gap-3 p-4">
            {mode === "broadcast" ? (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15">
                  <Zap className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Quick match</p>
                  <p className="text-xs text-muted-foreground">Broadcast to all available pros nearby.</p>
                </div>
                <Badge variant="secondary" className="ml-auto">Broadcast</Badge>
              </>
            ) : (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{vendor?.business_name ?? "Selected pro"}</p>
                  <p className="text-xs text-muted-foreground">Direct request to this vendor.</p>
                </div>
                <Badge className="ml-auto">Direct</Badge>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Job details</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="mb-2 block">Job location</Label>
              <LocationPicker />
            </div>

            {quotedPrice != null && priceType !== "quote" && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium">
                  Quoted price: ${quotedPrice.toFixed(2)}
                  {priceType === "hourly" ? " /hr" : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This is the vendor's listed rate. Final amount is collected by the vendor when the job is done. They may adjust with a note if scope changes.
                </p>
              </div>
            )}
            {priceType === "quote" && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium">Quote on request</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  The vendor will set a final price after assessing the job. Payment is collected on-site.
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="notes">Describe the job</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What do you need done? Any access notes, gate codes, materials, etc."
                rows={5}
              />
            </div>

            <div>
              <Label htmlFor="when">Preferred time (optional)</Label>
              <Input
                id="when"
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
            </div>

            <Button onClick={submit} disabled={submitting} className="w-full" size="lg">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "broadcast" ? "Broadcast job" : "Send request"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}