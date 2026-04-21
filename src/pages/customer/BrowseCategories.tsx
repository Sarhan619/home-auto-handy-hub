import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { iconForCategory } from "@/lib/categoryIcons";
import LocationPicker from "@/components/LocationPicker";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export default function BrowseCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("service_categories")
      .select("id,name,slug,description")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        setCategories(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SiteHeader />
      <main className="container py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">Customer</p>
          <h1 className="text-3xl font-bold tracking-tight">Browse services</h1>
          <p className="mt-1 text-muted-foreground">Pick a category to find local pros nearby.</p>
        </div>

        <section className="mb-8 max-w-xl">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Job location</h2>
          <LocationPicker />
        </section>

        <section>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)
              : categories.map((cat) => {
                  const Icon = iconForCategory(cat.slug);
                  return (
                    <Link key={cat.id} to={`/services/${cat.slug}`}>
                      <Card className="cursor-pointer shadow-card transition-[var(--transition-smooth)] hover:-translate-y-1 hover:shadow-elegant">
                        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{cat.name}</p>
                            {cat.description && (
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{cat.description}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
          </div>
        </section>
      </main>
    </div>
  );
}