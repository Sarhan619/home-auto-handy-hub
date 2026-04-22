import { useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, FileText, MapPin, Phone } from "lucide-react";

type VendorRow = {
  id: string;
  business_name: string;
  bio: string | null;
  phone: string | null;
  service_radius_km: number;
  base_address: string | null;
  verification_status: "pending" | "approved" | "rejected";
  license_doc_path: string | null;
  insurance_doc_path: string | null;
  created_at: string;
  vendor_services?: { id: string; price_type: "fixed" | "hourly" | "quote"; base_price: number | null; description: string | null; service_categories: { name: string } | null }[];
};

function formatServicePrice(priceType: "fixed" | "hourly" | "quote", basePrice: number | null) {
  if (priceType === "quote" || basePrice == null) return "Quote on request";
  return `$${Number(basePrice).toFixed(0)}${priceType === "hourly" ? "/hr" : ""}`;
}

function bulletPoints(text: string | null | undefined) {
  return (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 4);
}

type Status = "pending" | "approved" | "rejected";

const statusVariant = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
} as const;

export default function AdminVendors() {
  const [tab, setTab] = useState<Status>("pending");
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<VendorRow | null>(null);
  const [reason, setReason] = useState("");

  const load = async (status: Status) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vendors")
      .select("*,vendor_services(id,price_type,base_price,description,service_categories(name))")
      .eq("verification_status", status)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setVendors((data as VendorRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(tab); }, [tab]);

  const openDoc = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("vendor-documents")
      .createSignedUrl(path, 60);
    if (error) {
      toast.error(error.message);
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const approve = async (v: VendorRow) => {
    setActing(v.id);
    const { error } = await supabase
      .from("vendors")
      .update({ verification_status: "approved", rejection_reason: null })
      .eq("id", v.id);
    setActing(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${v.business_name} approved`);
    load(tab);
  };

  const reject = async () => {
    if (!rejecting) return;
    setActing(rejecting.id);
    const { error } = await supabase
      .from("vendors")
      .update({ verification_status: "rejected", rejection_reason: reason || "Did not meet requirements" })
      .eq("id", rejecting.id);
    setActing(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${rejecting.business_name} rejected`);
    setRejecting(null);
    setReason("");
    load(tab);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SiteHeader />
      <main className="container py-10">
        <div className="mb-6">
          <p className="text-sm font-medium text-destructive">Admin</p>
          <h1 className="text-3xl font-bold tracking-tight">Vendor approvals</h1>
          <p className="mt-1 text-muted-foreground">Review applications and verify documents.</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Status)} className="mb-6">
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : vendors.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No {tab} vendors.</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {vendors.map((v) => (
              <Card key={v.id} className="shadow-card">
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="text-xl">{v.business_name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Applied {new Date(v.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={statusVariant[v.verification_status]} className="capitalize">
                    {v.verification_status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  {v.bio && <p className="text-sm">{v.bio}</p>}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    {v.phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> {v.phone}</span>}
                    {v.base_address && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {v.base_address} · {v.service_radius_km} km</span>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {v.license_doc_path && (
                      <Button size="sm" variant="outline" onClick={() => openDoc(v.license_doc_path!)}>
                        <FileText className="h-4 w-4" /> License
                      </Button>
                    )}
                    {v.insurance_doc_path && (
                      <Button size="sm" variant="outline" onClick={() => openDoc(v.insurance_doc_path!)}>
                        <FileText className="h-4 w-4" /> Insurance
                      </Button>
                    )}
                  </div>

                  {v.vendor_services && v.vendor_services.length > 0 && (
                    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                      <p className="text-sm font-medium">Offered services</p>
                      <div className="space-y-3">
                        {v.vendor_services.map((service) => (
                          <div key={service.id} className="rounded-md border bg-background p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold">{service.service_categories?.name ?? "Service"}</p>
                              <Badge variant="outline">{formatServicePrice(service.price_type, service.base_price)}</Badge>
                            </div>
                            {bulletPoints(service.description).length > 0 && (
                              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                {bulletPoints(service.description).map((point) => (
                                  <li key={point} className="flex gap-2">
                                    <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {tab === "pending" && (
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => { setRejecting(v); setReason(""); }}
                        disabled={acting === v.id}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="hero"
                        onClick={() => approve(v)}
                        disabled={acting === v.id}
                      >
                        {acting === v.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Approve
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {rejecting?.business_name}?</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Reason (visible to the vendor)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={acting === rejecting?.id}>
              {acting === rejecting?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
