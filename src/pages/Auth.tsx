import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Wrench } from "lucide-react";

type Role = "customer" | "vendor";

export default function Auth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, roles, loading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("customer");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const dest =
        roles.includes("admin") ? "/admin" :
        roles.includes("vendor") ? "/vendor" : "/dashboard";
      navigate(dest, { replace: true });
    }
  }, [user, roles, loading, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName, role },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created! You're signed in.");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container flex min-h-screen items-center justify-center py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-hero shadow-elegant">
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">ServiceHub</span>
          </Link>

          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Welcome to ServiceHub</CardTitle>
              <CardDescription>Book trusted local services or grow your business.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input id="signin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input id="signin-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" variant="hero" className="w-full" disabled={busy}>
                      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full name</Label>
                      <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>I'm joining as a</Label>
                      <RadioGroup value={role} onValueChange={(v) => setRole(v as Role)} className="grid grid-cols-2 gap-3">
                        <Label htmlFor="r-customer" className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                          <RadioGroupItem id="r-customer" value="customer" />
                          <div>
                            <div className="font-medium">Customer</div>
                            <div className="text-xs text-muted-foreground">Book services</div>
                          </div>
                        </Label>
                        <Label htmlFor="r-vendor" className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                          <RadioGroupItem id="r-vendor" value="vendor" />
                          <div>
                            <div className="font-medium">Vendor</div>
                            <div className="text-xs text-muted-foreground">Earn locally</div>
                          </div>
                        </Label>
                      </RadioGroup>
                    </div>
                    <Button type="submit" variant="hero" className="w-full" disabled={busy}>
                      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
