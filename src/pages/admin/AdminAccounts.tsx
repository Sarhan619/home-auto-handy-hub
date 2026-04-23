import { useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Loader2, Upload, UserPlus, FileCheck2, ShieldCheck } from "lucide-react";
import { z } from "zod";

type RoleTab = "customer" | "vendor";
type Category = { id: string; name: string; slug: string };
type PriceType = "fixed" | "hourly" | "quote";
type ServiceDraft = {
  categoryId: string;
  priceType: PriceType;
  basePrice: string;
  description: string;
};

type CustomerForm = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

type VendorForm = CustomerForm & {
  businessName: string;
  primaryPhone: string;
  additionalContacts: string;
  baseAddress: string;
  serviceRadiusKm: string;
  bio: string;
};

const customerSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100, "Full name must be 100 characters or less"),
  email: z.string().trim().email("Enter a valid email").max(255, "Email must be 255 characters or less"),
  phone: z.string().trim().max(30, "Phone must be 30 characters or less").optional().or(z.literal("")),
  password: z.string().min(8, "Temporary password must be at least 8 characters").max(72, "Temporary password must be 72 characters or less"),
});

const vendorSchema = customerSchema.extend({
  businessName: z.string().trim().min(1, "Company name is required").max(120, "Company name must be 120 characters or less"),
  primaryPhone: z.string().trim().min(1, "Primary phone is required").max(30, "Primary phone must be 30 characters or less"),
  additionalContacts: z.string().max(300, "Additional contacts must be 300 characters or less"),
  baseAddress: z.string().trim().min(1, "Address is required").max(200, "Address must be 200 characters or less"),
  serviceRadiusKm: z.coerce.number().min(1, "Radius must be at least 1 km").max(250, "Radius must be 250 km or less"),
  bio: z.string().max(1000, "Business overview must be 1000 characters or less"),
});

const emptyCustomerForm: CustomerForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
};

const emptyVendorForm: VendorForm = {
  ...emptyCustomerForm,
  businessName: "",
  primaryPhone: "",
  additionalContacts: "",
  baseAddress: "",
  serviceRadiusKm: "25",
  bio: "",
};

export default function AdminAccounts() {
  const [tab, setTab] = useState<RoleTab>("vendor");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [serviceDrafts, setServiceDrafts] = useState<Record<string, ServiceDraft>>({});
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomerForm);
  const [vendorForm, setVendorForm] = useState<VendorForm>(emptyVendorForm);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [governmentIdFile, setGovernmentIdFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);

  useEffect(() => {
    supabase
      .from("service_categories")
      .select("id,name,slug")
      .eq("is_active", true)
      .order("name")
      .then(({ data, error }) => {
        if (error) {
          toast.error(error.message);
        } else {
          setCategories((data as Category[] | null) ?? []);
        }
        setLoading(false);
      });
  }, []);

  const selectedCount = selectedCategories.size;
  const additionalContactList = useMemo(
    () =>
      vendorForm.additionalContacts
        .split(/\r?\n|,/) 
        .map((value) => value.trim())
        .filter(Boolean),
    [vendorForm.additionalContacts],
  );

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });

    setServiceDrafts((prev) => {
      if (prev[categoryId]) return prev;
      return {
        ...prev,
        [categoryId]: {
          categoryId,
          priceType: "quote",
          basePrice: "",
          description: "",
        },
      };
    });
  };

  const updateServiceDraft = (categoryId: string, patch: Partial<ServiceDraft>) => {
    setServiceDrafts((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] ?? { categoryId, priceType: "quote", basePrice: "", description: "" }),
        ...patch,
      },
    }));
  };

  const uploadVendorDocument = async (file: File, kind: "license" | "government-id" | "insurance") => {
    const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const path = `admin-created/${crypto.randomUUID()}/${kind}-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("vendor-documents").upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  };

  const createCustomer = async () => {
    const parsed = customerSchema.safeParse(customerForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the customer form");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.functions.invoke("admin-create-account", {
      body: {
        role: "customer",
        ...parsed.data,
        phone: parsed.data.phone || null,
      },
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Customer account created");
    setCustomerForm(emptyCustomerForm);
  };

  const createVendor = async () => {
    const parsed = vendorSchema.safeParse(vendorForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the vendor form");
      return;
    }

    if (selectedCategories.size === 0) {
      toast.error("Select at least one service category");
      return;
    }

    const services = Array.from(selectedCategories).map((categoryId) => ({
      categoryId,
      priceType: serviceDrafts[categoryId]?.priceType ?? "quote",
      basePrice:
        (serviceDrafts[categoryId]?.priceType ?? "quote") === "quote"
          ? null
          : Number(serviceDrafts[categoryId]?.basePrice || 0),
      description: serviceDrafts[categoryId]?.description.trim() || null,
    }));

    const invalidPricedService = services.find(
      (service) => service.priceType !== "quote" && (!Number.isFinite(service.basePrice) || Number(service.basePrice) < 0),
    );
    if (invalidPricedService) {
      toast.error("Every fixed or hourly service needs a valid price");
      return;
    }

    setSubmitting(true);
    try {
      const [licenseDocPath, governmentIdDocPath, insuranceDocPath] = await Promise.all([
        licenseFile ? uploadVendorDocument(licenseFile, "license") : Promise.resolve<string | null>(null),
        governmentIdFile ? uploadVendorDocument(governmentIdFile, "government-id") : Promise.resolve<string | null>(null),
        insuranceFile ? uploadVendorDocument(insuranceFile, "insurance") : Promise.resolve<string | null>(null),
      ]);

      const { error } = await supabase.functions.invoke("admin-create-account", {
        body: {
          role: "vendor",
          fullName: parsed.data.fullName,
          email: parsed.data.email,
          phone: parsed.data.phone || parsed.data.primaryPhone,
          password: parsed.data.password,
          vendor: {
            businessName: parsed.data.businessName,
            bio: parsed.data.bio.trim() || null,
            baseAddress: parsed.data.baseAddress.trim(),
            serviceRadiusKm: parsed.data.serviceRadiusKm,
            primaryPhone: parsed.data.primaryPhone,
            contactNumbers: additionalContactList,
            licenseDocPath,
            governmentIdDocPath,
            insuranceDocPath,
            services,
            verificationStatus: "pending",
          },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Vendor account created and added to the approval queue");
      setVendorForm(emptyVendorForm);
      setSelectedCategories(new Set());
      setServiceDrafts({});
      setLicenseFile(null);
      setGovernmentIdFile(null);
      setInsuranceFile(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SiteHeader />
      <main className="container max-w-6xl py-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-destructive">Admin</p>
            <h1 className="text-3xl font-bold tracking-tight">Create accounts</h1>
            <p className="mt-1 text-muted-foreground">Manually create customer accounts and vendor profiles with documents, categories, and temporary passwords.</p>
          </div>
          <div className="rounded-lg border bg-card px-4 py-3 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vendor approval</p>
            <p className="mt-1 text-sm text-foreground">New vendor accounts start as pending and become customer-visible after approval.</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(value as RoleTab)}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="vendor">Vendor</TabsTrigger>
            <TabsTrigger value="customer">Customer</TabsTrigger>
          </TabsList>

          <TabsContent value="vendor" className="mt-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Login details</CardTitle>
                    <CardDescription>Create the vendor user account with a temporary password you can share securely.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <Field label="Owner or contact name" htmlFor="vendor-full-name">
                      <Input id="vendor-full-name" value={vendorForm.fullName} onChange={(e) => setVendorForm((prev) => ({ ...prev, fullName: e.target.value }))} maxLength={100} />
                    </Field>
                    <Field label="Email" htmlFor="vendor-email">
                      <Input id="vendor-email" type="email" value={vendorForm.email} onChange={(e) => setVendorForm((prev) => ({ ...prev, email: e.target.value }))} maxLength={255} />
                    </Field>
                    <Field label="Temporary password" htmlFor="vendor-password">
                      <Input id="vendor-password" type="text" value={vendorForm.password} onChange={(e) => setVendorForm((prev) => ({ ...prev, password: e.target.value }))} maxLength={72} />
                    </Field>
                    <Field label="Personal phone" htmlFor="vendor-phone">
                      <Input id="vendor-phone" value={vendorForm.phone} onChange={(e) => setVendorForm((prev) => ({ ...prev, phone: e.target.value }))} maxLength={30} />
                    </Field>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Company profile</CardTitle>
                    <CardDescription>These details power the vendor listing and approval review.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Company name" htmlFor="business-name">
                        <Input id="business-name" value={vendorForm.businessName} onChange={(e) => setVendorForm((prev) => ({ ...prev, businessName: e.target.value }))} maxLength={120} />
                      </Field>
                      <Field label="Primary business phone" htmlFor="primary-phone">
                        <Input id="primary-phone" value={vendorForm.primaryPhone} onChange={(e) => setVendorForm((prev) => ({ ...prev, primaryPhone: e.target.value }))} maxLength={30} />
                      </Field>
                    </div>
                    <Field label="Additional contact numbers" htmlFor="additional-contacts" hint="One per line or separated by commas.">
                      <Textarea id="additional-contacts" rows={3} value={vendorForm.additionalContacts} onChange={(e) => setVendorForm((prev) => ({ ...prev, additionalContacts: e.target.value }))} maxLength={300} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
                      <Field label="Address" htmlFor="base-address">
                        <Input id="base-address" value={vendorForm.baseAddress} onChange={(e) => setVendorForm((prev) => ({ ...prev, baseAddress: e.target.value }))} maxLength={200} />
                      </Field>
                      <Field label="Radius (km)" htmlFor="service-radius">
                        <Input id="service-radius" type="number" min={1} max={250} value={vendorForm.serviceRadiusKm} onChange={(e) => setVendorForm((prev) => ({ ...prev, serviceRadiusKm: e.target.value }))} />
                      </Field>
                    </div>
                    <Field label="Business overview" htmlFor="vendor-bio" hint="Short summary customers and admins can review.">
                      <Textarea id="vendor-bio" rows={4} value={vendorForm.bio} onChange={(e) => setVendorForm((prev) => ({ ...prev, bio: e.target.value }))} maxLength={1000} />
                    </Field>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle>Service categories</CardTitle>
                        <CardDescription>Select every category this vendor operates in, then add pricing and bullet-point service details.</CardDescription>
                      </div>
                      <Badge variant="outline">{selectedCount} selected</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {loading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {categories.map((category) => {
                          const checked = selectedCategories.has(category.id);
                          return (
                            <Label
                              key={category.id}
                              htmlFor={`category-${category.id}`}
                              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${checked ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}
                            >
                              <Checkbox id={`category-${category.id}`} checked={checked} onCheckedChange={() => toggleCategory(category.id)} />
                              <span className="text-sm font-medium">{category.name}</span>
                            </Label>
                          );
                        })}
                      </div>
                    )}

                    {Array.from(selectedCategories).length > 0 && (
                      <div className="space-y-4 border-t pt-5">
                        {categories.filter((category) => selectedCategories.has(category.id)).map((category) => {
                          const draft = serviceDrafts[category.id] ?? { categoryId: category.id, priceType: "quote" as const, basePrice: "", description: "" };
                          return (
                            <div key={category.id} className="rounded-lg border bg-muted/20 p-4">
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <p className="font-medium">{category.name}</p>
                                <Badge variant="outline" className="capitalize">{draft.priceType}</Badge>
                              </div>
                              <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                                <Field label="Pricing" htmlFor={`price-type-${category.id}`}>
                                  <select
                                    id={`price-type-${category.id}`}
                                    value={draft.priceType}
                                    onChange={(e) => updateServiceDraft(category.id, { priceType: e.target.value as PriceType })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                  >
                                    <option value="quote">Quote on request</option>
                                    <option value="fixed">Fixed price</option>
                                    <option value="hourly">Hourly rate</option>
                                  </select>
                                </Field>
                                {draft.priceType !== "quote" && (
                                  <Field label={draft.priceType === "hourly" ? "Hourly rate" : "Starting price"} htmlFor={`base-price-${category.id}`}>
                                    <Input
                                      id={`base-price-${category.id}`}
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      value={draft.basePrice}
                                      onChange={(e) => updateServiceDraft(category.id, { basePrice: e.target.value })}
                                    />
                                  </Field>
                                )}
                              </div>
                              <Field label="Service highlights" htmlFor={`service-description-${category.id}`} hint="Use short bullet points customers can scan quickly.">
                                <Textarea
                                  id={`service-description-${category.id}`}
                                  rows={4}
                                  value={draft.description}
                                  onChange={(e) => updateServiceDraft(category.id, { description: e.target.value.slice(0, 500) })}
                                  maxLength={500}
                                  placeholder={"• Same-day service\n• Licensed technicians\n• Upfront explanation of work"}
                                />
                              </Field>
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
                    <CardDescription>Upload the files needed for review before approval.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <DocumentField label="Business license" file={licenseFile} onFile={setLicenseFile} />
                    <DocumentField label="Government ID" file={governmentIdFile} onFile={setGovernmentIdFile} />
                    <DocumentField label="Insurance" file={insuranceFile} onFile={setInsuranceFile} />
                  </CardContent>
                </Card>
              </div>

              <Card className="h-fit xl:sticky xl:top-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Review summary</CardTitle>
                  <CardDescription>Vendor stays hidden from customers until approved from the admin queue.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="font-medium">What happens next</p>
                    <ul className="mt-2 space-y-2 text-muted-foreground">
                      <li>• Vendor account is created with vendor access.</li>
                      <li>• Profile is stored as pending for review.</li>
                      <li>• Approved vendors appear under their assigned categories.</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Included details</p>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      <li>• {selectedCount} service categor{selectedCount === 1 ? "y" : "ies"}</li>
                      <li>• {additionalContactList.length} additional contact number{additionalContactList.length === 1 ? "" : "s"}</li>
                      <li>• Temporary password set manually</li>
                    </ul>
                  </div>
                  <Button className="w-full" variant="hero" onClick={createVendor} disabled={submitting || loading}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create vendor account
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="customer" className="mt-6">
            <Card className="mx-auto max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> Create customer account</CardTitle>
                <CardDescription>Create a customer login with a temporary password the customer can use right away.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" htmlFor="customer-full-name">
                    <Input id="customer-full-name" value={customerForm.fullName} onChange={(e) => setCustomerForm((prev) => ({ ...prev, fullName: e.target.value }))} maxLength={100} />
                  </Field>
                  <Field label="Phone" htmlFor="customer-phone">
                    <Input id="customer-phone" value={customerForm.phone} onChange={(e) => setCustomerForm((prev) => ({ ...prev, phone: e.target.value }))} maxLength={30} />
                  </Field>
                </div>
                <Field label="Email" htmlFor="customer-email">
                  <Input id="customer-email" type="email" value={customerForm.email} onChange={(e) => setCustomerForm((prev) => ({ ...prev, email: e.target.value }))} maxLength={255} />
                </Field>
                <Field label="Temporary password" htmlFor="customer-password" hint="Share this securely with the customer.">
                  <Input id="customer-password" type="text" value={customerForm.password} onChange={(e) => setCustomerForm((prev) => ({ ...prev, password: e.target.value }))} maxLength={72} />
                </Field>
                <Button variant="hero" onClick={createCustomer} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create customer account
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function DocumentField({
  label,
  file,
  onFile,
}: {
  label: string;
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4">
        {file ? <FileCheck2 className="h-5 w-5 text-success" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
        <div className="flex-1 text-sm">
          {file ? <span className="font-medium">{file.name}</span> : <span className="text-muted-foreground">No file selected</span>}
        </div>
        <Input type="file" accept="application/pdf,image/*" className="max-w-[220px]" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      </div>
    </div>
  );
}
