import { useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { iconForCategory } from "@/lib/categoryIcons";

type Cat = { id: string; name: string; slug: string };

type Vendor = {
  id: string;
  business_name: string;
  price: number;
  description: string;
};

export default function CustomerDashboard() {
  const { user } = useAuth();

  const [categories, setCategories] = useState<Cat[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    description: "",
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("service_categories")
      .select("id,name,slug")
      .eq("is_active", true)
      .then(({ data }) => {
        setCategories(data || []);
        setLoading(false);
      });
  }, []);

  // Fetch vendors when category is selected
  const loadVendors = async (slug: string) => {
    setSelectedCategory(slug);
    setSelectedVendor(null);

    const { data } = await supabase
      .from("vendors")
      .select("id,business_name,price,description")
      .eq("category_slug", slug)
      .eq("verification_status", "approved");

    setVendors(data || []);
  };

  // Submit booking
  const handleSubmit = async () => {
    if (!user || !selectedVendor) return;

    await supabase.from("bookings").insert([
      {
        vendor_id: selectedVendor.id,
        customer_id: user.id,
        customer_name: form.name,
        phone: form.phone,
        job_address: form.address,
        description: form.description,
        status: "pending",
      },
    ]);

    alert("Request sent!");
    setSelectedVendor(null);
    setSelectedCategory(null);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SiteHeader />

      <main className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Find Services</h1>

        {/* STEP 1: Categories */}
        {!selectedCategory && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)
              : categories.map((cat) => {
                  const Icon = iconForCategory(cat.slug);
                  return (
                    <Card
                      key={cat.id}
                      onClick={() => loadVendors(cat.slug)}
                      className="cursor-pointer hover:shadow-lg"
                    >
                      <CardContent className="flex flex-col items-center p-6 gap-2">
                        <Icon className="h-6 w-6 text-primary" />
                        <span>{cat.name}</span>
                      </CardContent>
                    </Card>
                  );
                })}
          </div>
        )}

        {/* STEP 2: Vendors */}
        {selectedCategory && !selectedVendor && (
          <div>
            <Button variant="outline" onClick={() => setSelectedCategory(null)} className="mb-4">
              ← Back
            </Button>

            <h2 className="text-xl font-bold mb-4 capitalize">{selectedCategory} Vendors</h2>

            <div className="grid md:grid-cols-3 gap-4">
              {vendors.map((v) => (
                <Card key={v.id}>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold">{v.business_name}</h3>
                    <p className="text-sm text-muted-foreground">{v.description}</p>
                    <p className="font-bold">${v.price}</p>

                    <Button onClick={() => setSelectedVendor(v)}>
                      Select
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Booking Form */}
        {selectedVendor && (
          <div className="max-w-md">
            <Button variant="outline" onClick={() => setSelectedVendor(null)} className="mb-4">
              ← Back
            </Button>

            <h2 className="text-xl font-bold mb-4">
              Booking: {selectedVendor.business_name}
            </h2>

            <input
              className="w-full mb-3 p-2 border rounded"
              placeholder="Name"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <input
              className="w-full mb-3 p-2 border rounded"
              placeholder="Phone"
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />

            <input
              className="w-full mb-3 p-2 border rounded"
              placeholder="Address"
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />

            <textarea
              className="w-full mb-3 p-2 border rounded"
              placeholder="Describe your job"
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <Button onClick={handleSubmit} className="w-full">
              Submit Request
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
