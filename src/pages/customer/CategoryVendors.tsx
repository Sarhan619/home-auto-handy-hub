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
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ArrowLeft, MapPin, Star, Zap } from "lucide-react";

type Category = { id: string; name: string; slug: string };
type VendorService = {
  category_id: string;
  is_active: boolean;
  base_price: number | null;
  price_type: "fixed" | "hourly" | "quote";
  description: string | null;
  service_categories: { name: string; slug: string } | null;
};

type VendorRow = {
  id: string;
  business_name: string;
  bio: string | null;
  logo_url: string | null;
  avg_rating: number | null;
  total_jobs: number;
  is_online: boolean;
  base_lat: number | null;
  base_lng: number | null;
  service_radius_km: number;
  vendor_services: VendorService[] | null;
};

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bulletPoints(text: string | null | undefined) {
  return (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

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
  const [minRating, setMinRating] = useState(0);
  const [maxDistance, setMaxDistance] = useState(25);

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
    if (!category) {
      return;
    }
    setLoading(true);
    supabase
      .from("vendors")
      .select(
        "id,business_name,bio,logo_url,avg_rating,total_jobs,is_online,base_lat,base_lng,service_radius_km,vendor_services(category_id,is_active,base_price,price_type,description,service_categories(name,slug))"
      )
      .eq("verification_status", "approved")
      .order("is_online", { ascending: false })
      .order("avg_rating", { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        const rows = ((data as VendorRow[] | null) ?? []).filter((vendor) =>
          (vendor.vendor_services ?? []).some((service) => service.is_active && service.category_id === category.id)
        );
        setVendors(rows);
        setLoading(false);
      });

    return undefined;
  }, [category]);

  const visibleVendors = useMemo(() => {
    if (!category) return [];

    return vendors
      .map((vendor) => {
        const activeServices = (vendor.vendor_services ?? []).filter((service) => service.is_active);
        const featuredService =
          activeServices.find((service) => service.category_id === category.id) ?? activeServices[0] ?? null;
        const computedDistance =
          location && vendor.base_lat != null && vendor.base_lng != null
            ? distanceKm(location.lat, location.lng, Number(vendor.base_lat), Number(vendor.base_lng))
            : null;

        return {
          ...vendor,
          activeServices,
          featuredService,
          computedDistance,
        };
      })
      .filter((vendor) => !!vendor.featuredService)
      .filter((vendor) => (vendor.avg_rating ?? 0) >= minRating)
      .filter((vendor) => (location && vendor.computedDistance != null ? vendor.computedDistance <= maxDistance : true))
      .sort((a, b) => {
        if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
        if (location && a.computedDistance != null && b.computedDistance != null) {
          return a.computedDistance - b.computedDistance;
        }
        return (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
      });
  }, [category, location, maxDistance, minRating, vendors]);

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
            <p className="text-sm text-muted-foreground">Compare approved vendors first, then add your address later when you book.</p>
          </div>
        </div>

        <Card className="mb-6 border-accent/40 bg-accent/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex items-start gap-3">
              <Zap className="mt-0.5 h-5 w-5 text-accent" />
              <div>
                <p className="font-medium">Prefer not to choose a vendor?</p>
                <p className="text-sm text-muted-foreground">
                  Continue with your booking and we&apos;ll suggest or route it to available vendors automatically.
                </p>
              </div>
            </div>
            {category && (
              <Button asChild variant="accent">
                <Link to={`/book/new?category=${category.id}&mode=broadcast`}>Book without choosing</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="mb-6 space-y-4 rounded-lg border bg-background/70 p-4 shadow-card">
          <div className="max-w-xl">
            <p className="mb-2 text-sm font-medium">Optional location</p>
            <LocationPicker />
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-sm font-medium">Minimum rating</p>
              <div className="flex flex-wrap gap-2">
                {[0, 3.5, 4, 4.5].map((rating) => (
                  <Button
                    key={rating}
                    type="button"
                    variant={minRating === rating ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMinRating(rating)}
                  >
                    {rating === 0 ? "Any" : `${rating}+`}
                  </Button>
                ))}
              </div>
            </div>

            <div className="w-full max-w-sm">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">Distance</span>
                <span className="text-muted-foreground">
                  {location ? `Up to ${maxDistance} km` : "Add location to filter"}
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={maxDistance}
                disabled={!location}
                onChange={(event) => setMaxDistance(Number(event.target.value))}
                className="w-full accent-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Approved vendors</p>
            <p className="text-sm text-muted-foreground">
              {visibleVendors.length} provider{visibleVendors.length === 1 ? "" : "s"} shown
            </p>
          </div>
        </div>

        <div className="mb-6 max-w-xl">
          <LocationPicker />
        </div>

        <div className="space-y-4">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72" />)
              : visibleVendors.length === 0
              ? (
                <Card>
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                     No approved vendors match your current filters yet. You can widen the filters or continue without choosing a vendor.
                  </CardContent>
                </Card>
              )
              : visibleVendors.map((v) => (
                  <Card key={v.vendor_id} className="shadow-card transition-shadow hover:shadow-elegant">
                    <CardContent className="grid gap-5 p-5 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-center">
                      <div className="overflow-hidden rounded-lg border bg-muted/20">
                        <AspectRatio ratio={4 / 3}>
                          {v.logo_url ? (
                            <img src={v.logo_url} alt={`${v.business_name} photo`} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted/40">
                              <Avatar className="h-20 w-20">
                                <AvatarImage src={v.logo_url ?? undefined} alt={v.business_name} />
                                <AvatarFallback>{v.business_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                            </div>
                          )}
                        </AspectRatio>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
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
                            {v.computedDistance != null ? `${v.computedDistance.toFixed(1)} km away` : "Distance available after location is added"}
                          </span>
                        </div>

                        {v.activeServices.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {v.activeServices.slice(0, 4).map((service) => (
                              <Badge
                                key={`${v.id}-${service.category_id}`}
                                variant={service.category_id === category?.id ? "default" : "secondary"}
                              >
                                {service.service_categories?.name ?? "Service"}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {bulletPoints(v.featuredService?.description ?? v.bio).length > 0 && (
                          <ul className="mt-3 max-w-xl space-y-1 text-sm text-muted-foreground">
                            {bulletPoints(v.featuredService?.description ?? v.bio).map((point) => (
                              <li key={point} className="flex gap-2">
                                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end">
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatPrice({ ...v, ...v.featuredService!, vendor_id: v.id, distance_km: v.computedDistance ?? 0, service_description: v.featuredService?.description ?? null })}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{v.featuredService?.price_type === "quote" ? "Final quote after review" : "Listed starting price"}</p>
                        </div>
                        <Button asChild size="sm">
                          <Link
                            to={`/book/new?category=${category!.id}&mode=direct&vendor=${v.id}${
                              v.featuredService?.price_type !== "quote" && v.featuredService?.base_price != null
                                ? `&price=${v.featuredService.base_price}&priceType=${v.featuredService.price_type}`
                                : `&priceType=quote`
                            }`}
                          >
                            Select vendor
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
        </div>
      </main>
    </div>
  );
}