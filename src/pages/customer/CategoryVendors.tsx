import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import LocationPicker from "@/components/LocationPicker";
import { useJobLocation } from "@/hooks/useJobLocation";
import { iconForCategory } from "@/lib/categoryIcons";
import { ArrowLeft, MapPin, Star, Zap } from "lucide-react";

type Category = { id: string; name: string; slug: string };
type VendorRow = {
  vendor_id: string;
  business_name: string;
  bio: string | null;
  logo_url: string | null;
  avg_rating: number | null;
  total_jobs: number;
  is_online: boolean;
  distance_km: number;
  base_price: number | null;
  price_type: "fixed" | "hourly" | "quote";
};

function formatPrice(v: VendorRow) {
  if (v.price_type === "quote" || v.base_price == null) return "Quote on request";
  return `$${Number(v.base_price).toFixed(0)}${v.price_type === "hourly" ? "/hr" : ""}`;
}

export default function CategoryVendors() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { location } = useJobLocation();
  const [category, setCategory] = useState<Category | null>(null);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const Icon = useMemo(() => iconForCategory(slug ?? ""), [slug]);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("service_categories")
      .select("id,name,slug")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => setCategory(data as Category | null));
  }, [slug]);

  useEffect(() => {
    if (!category || !location) {
      setLoading(false);
      setVendors([]);
      return;
    }
    setLoading(true);
    supabase
      .rpc("search_vendors_for_job", {
        _category_id: category.id,
        _lat: location.lat,
        _lng: location.lng,
      })
      .then(({ data }) => {
        setVendors((data as VendorRow[]) ?? []);
        setLoading(false);
      });
  }, [category, location]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SiteHeader />
      <main className="container py-10">
        <Button variant="ghost" size="sm" onClick={() => navigate("/services")} className="mb-4 -ml-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> All services
        </Button>

        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{category?.name ?? "Service"}</h1>
            <p className="text-sm text-muted-foreground">Approved local pros in your service area.</p>
          </div>
        </div>

        <div className="mb-6 max-w-xl">
          <LocationPicker />
        </div>

        {category && location && (
          <Card className="mb-6 border-accent/40 bg-accent/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="flex items-start gap-3">
                <Zap className="mt-0.5 h-5 w-5 text-accent" />
                <div>
                  <p className="font-medium">In a hurry? Use Quick match</p>
                  <p className="text-sm text-muted-foreground">
                    Broadcast your job to all available pros — first to accept wins.
                  </p>
                </div>
              </div>
              <Button asChild variant="accent">
                <Link to={`/book/new?category=${category.id}&mode=broadcast`}>Quick match</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!location && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Set your job location above to see vendors that serve your area.
            </CardContent>
          </Card>
        )}

        {location && (
          <div className="space-y-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)
              : vendors.length === 0
              ? (
                <Card>
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    No approved vendors cover this location yet. Try Quick match — we'll notify any pros who come online.
                  </CardContent>
                </Card>
              )
              : vendors.map((v) => (
                  <Card key={v.vendor_id} className="shadow-card transition-shadow hover:shadow-elegant">
                    <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={v.logo_url ?? undefined} alt={v.business_name} />
                          <AvatarFallback>{v.business_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{v.business_name}</p>
                            {v.is_online && <Badge variant="default" className="h-5 text-[10px]">Online</Badge>}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 text-accent" />
                              {v.avg_rating ? v.avg_rating.toFixed(1) : "New"} · {v.total_jobs} jobs
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {Number(v.distance_km).toFixed(1)} km away
                            </span>
                          </div>
                          {v.bio && <p className="mt-2 line-clamp-2 max-w-md text-xs text-muted-foreground">{v.bio}</p>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                        <p className="text-sm font-semibold">{formatPrice(v)}</p>
                        <Button asChild size="sm">
                          <Link
                            to={`/book/new?category=${category!.id}&mode=direct&vendor=${v.vendor_id}${
                              v.price_type !== "quote" && v.base_price != null
                                ? `&price=${v.base_price}&priceType=${v.price_type}`
                                : `&priceType=quote`
                            }`}
                          >
                            Request
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
          </div>
        )}
      </main>
    </div>
  );
}