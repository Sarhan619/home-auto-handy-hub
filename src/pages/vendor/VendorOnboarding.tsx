import { useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type Category = { id: string; name: string; slug: string };
type ServiceDraft = {
  categoryId: string;
  priceType: "fixed" | "hourly" | "quote";
  basePrice: string;
  description: string;
};
type Vendor = {
  id: string;
  business_name: string;
  bio: string | null;
  phone: string | null;
  service_radius_km: number;
  base_address: string | null;
  verification_status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  license_doc_path: string | null;
  insurance_doc_path: string | null;
};

const statusVariant = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
} as const;

export default function VendorOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [services, setServices] = useState<Record<string, ServiceDraft>>({});

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [radius, setRadius] = useState("25");
  const [address, setAddress] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [cats, v] = await Promise.all([
        supabase.from("service_categories").select("id,name,slug").eq("is_active", true).order("name"),
        supabase.from("vendors").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cats.data) setCategories(cats.data);
      if (v.data) {
        setVendor(v.data as Vendor);
        setBusinessName(v.data.business_name);
        setBio(v.data.bio ?? "");
        setPhone(v.data.phone ?? "");
        setRadius(String(v.data.service_radius_km));
        setAddress(v.data.base_address ?? "");
        const offerings = await supabase
          .from("vendor_services")
          .select("category_id,price_type,base_price,description")
          .eq("vendor_id", v.data.id);
        if (offerings.data) {
          setSelected(new Set(offerings.data.map((r) => r.category_id)));
          setServices(
            offerings.data.reduce<Record<string, ServiceDraft>>((acc, row) => {
              acc[row.category_id] = {
                categoryId: row.category_id,
                priceType: row.price_type,
                basePrice: row.base_price != null ? String(row.base_price) : "",
                description: row.description ?? "",
              };
              return acc;
            }, {})
          );
        }
      }
      setLoading(false);
    })();
  }, [user]);

  const toggleCategory = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const has = next.has(id);
      if (has) next.delete(id);
      else next.add(id);
      return next;
    });
    setServices((prev) => {
      if (prev[id]) return prev;
      return {
        ...prev,
        [id]: { categoryId: id, priceType: "quote", basePrice: "", description: "" },
      };
    });
  };

  const updateService = (categoryId: string, patch: Partial<ServiceDraft>) => {
    setServices((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] ?? { categoryId, priceType: "quote", basePrice: "", description: "" }),
        ...patch,
      },
    }));
  };

  const uploadDoc = async (file: File, kind: "license" | "insurance") => {
    if (!user) throw new Error("not signed in");
    const path = `${user.id}/${kind}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("vendor-documents").upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (selected.size === 0) {
      toast.error("Select at least one service category.");
      return;
    }
    setSaving(true);
    try {
      let licensePath = vendor?.license_doc_path ?? null;
      let insurancePath = vendor?.insurance_doc_path ?? null;
      if (licenseFile) licensePath = await uploadDoc(licenseFile, "license");
      if (insuranceFile) insurancePath = await uploadDoc(insuranceFile, "insurance");

      let vendorId = vendor?.id;
      if (vendorId) {
        const { error } = await supabase
          .from("vendors")
          .update({
            business_name: businessName,
            bio,
            phone,
            service_radius_km: Number(radius),
            base_address: address,
            license_doc_path: licensePath,
            insurance_doc_path: insurancePath,
          })
          .eq("id", vendorId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("vendors")
          .insert({
            user_id: user.id,
            business_name: businessName,
            bio,
            phone,
            service_radius_km: Number(radius),
            base_address: address,
            license_doc_path: licensePath,
            insurance_doc_path: insurancePath,
          })
          .select("id")
          .single();
        if (error) throw error;
        vendorId = data.id;
      }

      // Sync vendor_services: clear and re-insert is simplest for now
      await supabase.from("vendor_services").delete().eq("vendor_id", vendorId!);
      if (selected.size > 0) {
        const rows = Array.from(selected).map((category_id) => ({
          vendor_id: vendorId!,
          category_id,
          price_type: services[category_id]?.priceType ?? "quote",
          base_price:
            services[category_id]?.priceType === "quote"
              ? null
              : Number(services[category_id]?.basePrice || 0),
          description: services[category_id]?.description.trim() || null,
        }));
        const { error } = await supabase.from("vendor_services").insert(rows);
        if (error) throw error;
      }

      toast.success(vendor ? "Profile updated" : "Profile submitted for review");
      navigate("/vendor");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

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
      <main className="container max-w-3xl py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-accent">Vendor onboarding</p>
            <h1 className="text-3xl font-bold tracking-tight">
              {vendor ? "Your business profile" : "Set up your business"}
            </h1>
            <p className="mt-1 text-muted-foreground">
              Tell customers who you are and what you offer.
            </p>
          </div>
          {vendor && (
            <Badge variant={statusVariant[vendor.verification_status]} className="capitalize">
              {vendor.verification_status}
            </Badge>
          )}
        </div>

        {vendor?.verification_status === "rejected" && vendor.rejection_reason && (
          <Card className="mb-6 border-destructive/40 bg-destructive/5">
            <CardContent className="p-4 text-sm">
              <span className="font-semibold text-destructive">Rejection reason: </span>
              {vendor.rejection_reason}
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bn">Business name *</Label>
                <Input id="bn" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">About your business</Label>
                <Textarea id="bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="radius">Service radius (km)</Label>
                  <Input id="radius" type="number" min={1} value={radius} onChange={(e) => setRadius(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr">Base address</Label>
                <Input id="addr" placeholder="Street, city" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Services you offer</CardTitle>
              <CardDescription>Choose categories, then add pricing and short bullet-point service details for each one.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {categories.map((c) => {
                  const checked = selected.has(c.id);
                  return (
                    <Label
                      key={c.id}
                      htmlFor={`cat-${c.id}`}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <Checkbox id={`cat-${c.id}`} checked={checked} onCheckedChange={() => toggleCategory(c.id)} />
                      <span className="text-sm font-medium">{c.name}</span>
                    </Label>
                  );
                })}
              </div>

              {Array.from(selected).length > 0 && (
                <div className="space-y-4 border-t pt-5">
                  {categories
                    .filter((c) => selected.has(c.id))
                    .map((category) => {
                      const service = services[category.id] ?? {
                        categoryId: category.id,
                        priceType: "quote" as const,
                        basePrice: "",
                        description: "",
                      };

                      return (
                        <div key={category.id} className="rounded-lg border bg-muted/20 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="font-medium">{category.name}</p>
                            <Badge variant="outline" className="capitalize">{service.priceType}</Badge>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                            <div className="space-y-2">
                              <Label htmlFor={`price-type-${category.id}`}>Pricing</Label>
                              <select
                                id={`price-type-${category.id}`}
                                value={service.priceType}
                                onChange={(e) => updateService(category.id, { priceType: e.target.value as ServiceDraft["priceType"] })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              >
                                <option value="quote">Quote on request</option>
                                <option value="fixed">Fixed price</option>
                                <option value="hourly">Hourly rate</option>
                              </select>
                            </div>

                            {service.priceType !== "quote" && (
                              <div className="space-y-2">
                                <Label htmlFor={`base-price-${category.id}`}>
                                  {service.priceType === "hourly" ? "Hourly rate" : "Starting price"}
                                </Label>
                                <Input
                                  id={`base-price-${category.id}`}
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={service.basePrice}
                                  onChange={(e) => updateService(category.id, { basePrice: e.target.value })}
                                  placeholder={service.priceType === "hourly" ? "95" : "150"}
                                />
                              </div>
                            )}
                          </div>

                          <div className="mt-4 space-y-2">
                            <Label htmlFor={`description-${category.id}`}>Service highlights</Label>
                            <Textarea
                              id={`description-${category.id}`}
                              rows={4}
                              value={service.description}
                              onChange={(e) => updateService(category.id, { description: e.target.value.slice(0, 500) })}
                              placeholder={"• Mobile service\n• Same-day availability\n• Parts and labor explained upfront"}
                              maxLength={500}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verification documents</CardTitle>
              <CardDescription>Upload your license and insurance (PDF or image).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DocField
                label="Business license"
                existing={vendor?.license_doc_path}
                onFile={setLicenseFile}
                file={licenseFile}
              />
              <DocField
                label="Insurance certificate"
                existing={vendor?.insurance_doc_path}
                onFile={setInsuranceFile}
                file={insuranceFile}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/vendor")}>Cancel</Button>
            <Button type="submit" variant="hero" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {vendor ? "Save changes" : "Submit for review"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

function DocField({
  label,
  existing,
  file,
  onFile,
}: {
  label: string;
  existing: string | null | undefined;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4">
        {existing && !file ? (
          <FileCheck2 className="h-5 w-5 text-success" />
        ) : (
          <Upload className="h-5 w-5 text-muted-foreground" />
        )}
        <div className="flex-1 text-sm">
          {file ? (
            <span className="font-medium">{file.name}</span>
          ) : existing ? (
            <span className="text-muted-foreground">Uploaded — replace if needed</span>
          ) : (
            <span className="text-muted-foreground">No file selected</span>
          )}
        </div>
        <Input
          type="file"
          accept="application/pdf,image/*"
          className="max-w-[220px]"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}
