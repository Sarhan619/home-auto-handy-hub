import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Star, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { iconForCategory } from "@/lib/categoryIcons";
import { STATUS_LABEL, STATUS_VARIANT, ACTIVE_STATUSES, type BookingStatus } from "@/lib/booking";
import { toast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type Cat = { id: string; name: string; slug: string };

type ActiveBooking = {
  id: string;
  status: BookingStatus;
  job_address: string;
  service_categories: { name: string } | null;
};

type Vendor = {
  id: string;
  business_name: string;
  avg_rating: number | null;
  review_count: number | null;
  is_available_today: boolean;
};

type ServiceDetail = "full" | "interior" | "exterior";

type BookingFormState = {
  name: string;
  phone: string;
  address: string;
  car_make_model: string;
  car_year: string;
  service_detail: ServiceDetail;
  notes: string;
};

// ─── View states ──────────────────────────────────────────────────────────────

type View =
  | { type: "dashboard" }
  | { type: "vendors"; category: Cat }
  | { type: "booking"; category: Cat; vendor: Vendor };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_COLORS = [
  { bg: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-teal-100", text: "text-teal-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-sky-100", text: "text-sky-700" },
];
function avatarColor(id: string) {
  const idx = id.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5 text-amber-400">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className="h-3 w-3"
          fill={value >= s ? "currentColor" : "none"}
          strokeWidth={1.5}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{value.toFixed(1)}</span>
    </span>
  );
}

// ─── Vendor List ──────────────────────────────────────────────────────────────

function VendorList({
  category,
  onBack,
  onSelect,
}: {
  category: Cat;
  onBack: () => void;
  onSelect: (v: Vendor) => void;
}) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("vendor_profiles")
      .select("id,business_name,avg_rating,review_count,is_available_today")
      .contains("service_category_ids", [category.id])
      .eq("is_active", true)
      .order("avg_rating", { ascending: false })
      .then(({ data }) => {
        setVendors((data as Vendor[]) ?? []);
        setLoading(false);
      });
  }, [category.id]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">{category.name}</h2>
          <p className="text-sm text-muted-foreground">
            Select a vendor to book
          </p>
        </div>
      </div>

      {/* Vendor cards */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))
        ) : vendors.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No vendors available for this service yet.
          </p>
        ) : (
          vendors.map((v) => {
            const { bg, text } = avatarColor(v.id);
            return (
              <Card
                key={v.id}
                className="cursor-pointer shadow-card transition-shadow hover:shadow-elegant"
                onClick={() => onSelect(v)}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  {/* Avatar */}
                  <div
                    className={`h-11 w-11 flex-shrink-0 rounded-full ${bg} ${text} flex items-center justify-center text-sm font-semibold`}
                  >
                    {initials(v.business_name)}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{v.business_name}</p>
                    <div className="mt-0.5 flex items-center gap-3">
                      {v.avg_rating ? (
                        <StarRating value={v.avg_rating} />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No reviews yet
                        </span>
                      )}
                      {v.review_count ? (
                        <span className="text-xs text-muted-foreground">
                          {v.review_count} reviews
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Badge
                      variant={v.is_available_today ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {v.is_available_today ? "Today" : "Check avail."}
                    </Badge>
                    <Button size="sm">Book</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Booking Form ─────────────────────────────────────────────────────────────

function BookingFormView({
  category,
  vendor,
  onBack,
  onSuccess,
  userId,
}: {
  category: Cat;
  vendor: Vendor;
  onBack: () => void;
  onSuccess: () => void;
  userId: string;
}) {
  const [form, setForm] = useState<BookingFormState>({
    name: "",
    phone: "",
    address: "",
    car_make_model: "",
    car_year: "",
    service_detail: "full",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof BookingFormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    const required: (keyof BookingFormState)[] = [
      "name",
      "phone",
      "address",
      "car_make_model",
      "car_year",
    ];
    const missing = required.some((k) => !form[k].trim());
    if (missing) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("bookings").insert({
      customer_id: userId,
      vendor_id: vendor.id,
      service_category_id: category.id,
      job_address: form.address,
      status: "pending",
      metadata: {
        customer_name: form.name,
        customer_phone: form.phone,
        car_make_model: form.car_make_model,
        car_year: form.car_year,
        service_detail: form.service_detail,
        notes: form.notes,
      },
    });
    setSubmitting(false);

    if (error) {
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Booking confirmed!",
      description: `${vendor.business_name} will reach out shortly.`,
    });
    onSuccess();
  };

  const detailOptions: { value: ServiceDetail; label: string; desc: string }[] =
    [
      { value: "full", label: "Full detail", desc: "Inside & out" },
      { value: "interior", label: "Interior", desc: "Cabin only" },
      { value: "exterior", label: "Exterior", desc: "Body only" },
    ];

  const { bg, text } = avatarColor(vendor.id);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <div
            className={`h-9 w-9 flex-shrink-0 rounded-full ${bg} ${text} flex items-center justify-center text-xs font-semibold`}
          >
            {initials(vendor.business_name)}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Book with {vendor.business_name}
            </h2>
            <p className="text-sm text-muted-foreground">{category.name}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Your details */}
        <Card>
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="text-base">Your details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 pb-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Full name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">
                Phone number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+1 (503) 555-0100"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">
                Service address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="123 Main St, Portland, OR"
              />
            </div>
          </CardContent>
        </Card>

        {/* Vehicle details */}
        <Card>
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="text-base">Vehicle details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 pb-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="car">
                Make &amp; model <span className="text-destructive">*</span>
              </Label>
              <Input
                id="car"
                value={form.car_make_model}
                onChange={(e) => set("car_make_model", e.target.value)}
                placeholder="Toyota Camry"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year">
                Year <span className="text-destructive">*</span>
              </Label>
              <Input
                id="year"
                value={form.car_year}
                onChange={(e) => set("car_year", e.target.value)}
                placeholder="2021"
                maxLength={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Service type */}
        <Card>
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="text-base">Service type</CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="grid grid-cols-3 gap-3">
              {detailOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("service_detail", opt.value)}
                  className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                    form.service_detail === opt.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Special instructions, pet hair, stains, access codes…"
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Confirming…" : "Confirm booking"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Cat[]>([]);
  const [active, setActive] = useState<ActiveBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ type: "dashboard" });

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from("service_categories")
        .select("id,name,slug")
        .eq("is_active", true)
        .order("name")
        .limit(6),
      supabase
        .from("bookings")
        .select("id,status,job_address,service_categories(name)")
        .eq("customer_id", user.id)
        .in("status", ACTIVE_STATUSES)
        .order("created_at", { ascending: false }),
    ]).then(([cats, bks]) => {
      setCategories((cats.data as Cat[]) ?? []);
      setActive((bks.data as unknown as ActiveBooking[]) ?? []);
      setLoading(false);
    });
  }, [user]);

  // Refresh active bookings after a successful booking
  const refreshActive = () => {
    if (!user) return;
    supabase
      .from("bookings")
      .select("id,status,job_address,service_categories(name)")
      .eq("customer_id", user.id)
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setActive((data as unknown as ActiveBooking[]) ?? []);
        setView({ type: "dashboard" });
      });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SiteHeader />
      <main className="container py-10">

        {/* ── VENDOR LIST view ── */}
        {view.type === "vendors" && (
          <VendorList
            category={view.category}
            onBack={() => setView({ type: "dashboard" })}
            onSelect={(vendor) =>
              setView({ type: "booking", category: view.category, vendor })
            }
          />
        )}

        {/* ── BOOKING FORM view ── */}
        {view.type === "booking" && user && (
          <BookingFormView
            category={view.category}
            vendor={view.vendor}
            userId={user.id}
            onBack={() =>
              setView({ type: "vendors", category: view.category })
            }
            onSuccess={refreshActive}
          />
        )}

        {/* ── DASHBOARD view ── */}
        {view.type === "dashboard" && (
          <>
            {/* Welcome */}
            <div className="mb-8">
              <p className="text-sm font-medium text-primary">Customer</p>
              <h1 className="text-3xl font-bold tracking-tight">
                Welcome
                {user?.email ? `, ${user.email.split("@")[0]}` : ""}
              </h1>
              <p className="mt-1 text-muted-foreground">
                Find trusted local pros for any home or auto job.
              </p>
            </div>

            {/* Browse services */}
            <section className="mb-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Browse services</h2>
                <Button asChild variant="link" className="px-0">
                  <Link to="/services">See all</Link>
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-28" />
                    ))
                  : categories.map((cat) => {
                      const Icon = iconForCategory(cat.slug);
                      return (
                        <button
                          key={cat.id}
                          onClick={() =>
                            setView({ type: "vendors", category: cat })
                          }
                          className="text-left"
                        >
                          <Card className="cursor-pointer shadow-card transition-[var(--transition-smooth)] hover:-translate-y-1 hover:shadow-elegant">
                            <CardContent className="flex flex-col items-center gap-3 p-6">
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                <Icon className="h-6 w-6 text-primary" />
                              </div>
                              <span className="text-center text-sm font-medium">
                                {cat.name}
                              </span>
                            </CardContent>
                          </Card>
                        </button>
                      );
                    })}
              </div>
            </section>

            {/* Active bookings + Recent activity */}
            <section className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Active bookings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {active.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No active bookings. Pick a service above to get started.
                    </p>
                  ) : (
                    active.slice(0, 4).map((b) => (
                      <Link key={b.id} to={`/bookings/${b.id}`} className="block">
                        <div className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {b.service_categories?.name ?? "Service"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {b.job_address}
                            </p>
                          </div>
                          <Badge variant={STATUS_VARIANT[b.status]}>
                            {STATUS_LABEL[b.status]}
                          </Badge>
                        </div>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Your booking history will appear here.
                  </p>
                  <Button asChild variant="link" className="mt-2 px-0">
                    <Link to="/bookings">View all</Link>
                  </Button>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
