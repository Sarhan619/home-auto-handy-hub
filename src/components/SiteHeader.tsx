import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Wrench } from "lucide-react";

export default function SiteHeader() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();

  const dashHref =
    roles.includes("admin") ? "/admin" :
    roles.includes("vendor") ? "/vendor" : "/dashboard";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero shadow-elegant">
            <Wrench className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">ServiceHub</span>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              {roles.includes("customer") && (
                <>
                  <Button variant="ghost" onClick={() => navigate("/services")} className="hidden sm:inline-flex">
                    Services
                  </Button>
                  <Button variant="ghost" onClick={() => navigate("/bookings")} className="hidden sm:inline-flex">
                    Bookings
                  </Button>
                </>
              )}
              {roles.includes("vendor") && (
                <Button variant="ghost" onClick={() => navigate("/vendor/jobs")} className="hidden sm:inline-flex">
                  Jobs
                </Button>
              )}
              <Button variant="ghost" onClick={() => navigate(dashHref)}>
                Dashboard
              </Button>
              <Button variant="outline" onClick={async () => { await signOut(); navigate("/"); }}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate("/auth")}>Sign in</Button>
              <Button variant="hero" onClick={() => navigate("/auth?mode=signup")}>Get started</Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
