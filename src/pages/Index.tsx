import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import { Car, Droplets, Trees, Truck, Home as HomeIcon, Wrench, ShieldCheck, Clock, Wallet } from "lucide-react";
import hero from "@/assets/hero.jpg";

const categories = [
  { icon: Droplets, label: "Car Wash" },
  { icon: Trees, label: "Lawn Care" },
  { icon: Truck, label: "Towing" },
  { icon: HomeIcon, label: "Roofing" },
  { icon: Car, label: "Auto Repair" },
  { icon: Wrench, label: "Handyman" },
];

const features = [
  { icon: ShieldCheck, title: "Verified pros", body: "Every vendor is background-checked and rated by real customers." },
  { icon: Clock, title: "Book in minutes", body: "Get matched with available local pros nearby — fast." },
  { icon: Wallet, title: "Secure payments", body: "Pay only when the job is done. Funds held safely in escrow." },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-subtle">
        <div className="container grid gap-10 py-16 lg:grid-cols-2 lg:gap-12 lg:py-24">
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-card">
              <span className="h-2 w-2 rounded-full bg-success" /> Trusted local pros, on demand
            </span>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Home & auto services,{" "}
              <span className="bg-gradient-hero bg-clip-text text-transparent">done right.</span>
            </h1>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">
              Book vetted pros for car wash, lawn care, towing, roofing and more — all in one marketplace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg">
                <Link to="/auth?mode=signup">Book a service</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/auth?mode=signup">Become a vendor</Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <div><span className="font-bold text-foreground">10k+</span> jobs completed</div>
              <div><span className="font-bold text-foreground">4.9★</span> average rating</div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-hero opacity-20 blur-3xl" />
            <img
              src={hero}
              alt="Local service professional at a suburban home"
              className="rounded-2xl shadow-elegant"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-16">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Popular services</h2>
          <p className="mt-2 text-muted-foreground">Pick a category to see local pros near you.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map(({ icon: Icon, label }) => (
            <Link
              key={label}
              to="/auth?mode=signup"
              className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 shadow-card transition-[var(--transition-smooth)] hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-secondary/40 py-16">
        <div className="container">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Why ServiceHub</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-6 shadow-card">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-hero shadow-elegant">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vendor CTA */}
      <section className="container py-16">
        <div className="overflow-hidden rounded-2xl bg-gradient-hero p-10 text-center shadow-elegant md:p-16">
          <h2 className="text-3xl font-bold tracking-tight text-primary-foreground">Are you a service pro?</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            Grow your business with local jobs delivered straight to your phone.
          </p>
          <Button asChild variant="accent" size="lg" className="mt-6">
            <Link to="/auth?mode=signup">Join as a vendor</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ServiceHub. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Index;
