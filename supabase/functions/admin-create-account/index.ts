import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Role = "customer" | "vendor";
type PriceType = "fixed" | "hourly" | "quote";

type VendorServiceInput = {
  categoryId: string;
  priceType: PriceType;
  basePrice: number | null;
  description: string | null;
};

type Payload = {
  role: Role;
  email: string;
  password: string;
  fullName: string;
  phone?: string | null;
  vendor?: {
    businessName: string;
    bio?: string | null;
    baseAddress?: string | null;
    serviceRadiusKm: number;
    primaryPhone?: string | null;
    contactNumbers: string[];
    licenseDocPath?: string | null;
    governmentIdDocPath?: string | null;
    insuranceDocPath?: string | null;
    services: VendorServiceInput[];
    verificationStatus?: "pending" | "approved" | "rejected";
  };
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Project backend secrets are not configured");
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function badRequest(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parsePayload(body: unknown): Payload {
  if (!body || typeof body !== "object") throw new Error("Invalid request body");
  const raw = body as Record<string, unknown>;
  const role = raw.role;
  const email = String(raw.email ?? "").trim().toLowerCase();
  const password = String(raw.password ?? "");
  const fullName = String(raw.fullName ?? "").trim();
  const phone = raw.phone == null ? null : normalizePhone(String(raw.phone));

  if (role !== "customer" && role !== "vendor") throw new Error("Role must be customer or vendor");
  if (!email || email.length > 255) throw new Error("A valid email is required");
  if (password.length < 8 || password.length > 72) throw new Error("Password must be between 8 and 72 characters");
  if (!fullName || fullName.length > 100) throw new Error("Full name is required and must be under 100 characters");
  if (phone && phone.length > 30) throw new Error("Phone number must be under 30 characters");

  const payload: Payload = { role, email, password, fullName, phone };

  if (role === "vendor") {
    const vendorRaw = raw.vendor;
    if (!vendorRaw || typeof vendorRaw !== "object") throw new Error("Vendor details are required");
    const vendor = vendorRaw as Record<string, unknown>;
    const businessName = String(vendor.businessName ?? "").trim();
    const bio = vendor.bio == null ? null : String(vendor.bio).trim();
    const baseAddress = vendor.baseAddress == null ? null : String(vendor.baseAddress).trim();
    const radiusValue = Number(vendor.serviceRadiusKm ?? 25);
    const primaryPhone = vendor.primaryPhone == null ? phone : normalizePhone(String(vendor.primaryPhone));
    const contactNumbers = Array.isArray(vendor.contactNumbers)
      ? vendor.contactNumbers.map((item) => normalizePhone(String(item))).filter(Boolean)
      : [];
    const licenseDocPath = vendor.licenseDocPath == null ? null : String(vendor.licenseDocPath);
    const governmentIdDocPath = vendor.governmentIdDocPath == null ? null : String(vendor.governmentIdDocPath);
    const insuranceDocPath = vendor.insuranceDocPath == null ? null : String(vendor.insuranceDocPath);
    const verificationStatus = vendor.verificationStatus === "approved" || vendor.verificationStatus === "rejected"
      ? vendor.verificationStatus
      : "pending";

    if (!businessName || businessName.length > 120) throw new Error("Business name is required and must be under 120 characters");
    if (bio && bio.length > 1000) throw new Error("Business bio must be under 1000 characters");
    if (baseAddress && baseAddress.length > 200) throw new Error("Address must be under 200 characters");
    if (!Number.isFinite(radiusValue) || radiusValue < 1 || radiusValue > 250) throw new Error("Service radius must be between 1 and 250 km");
    if (primaryPhone && primaryPhone.length > 30) throw new Error("Primary phone must be under 30 characters");
    if (contactNumbers.some((value) => value.length > 30)) throw new Error("Additional contact numbers must be under 30 characters");

    const servicesRaw = Array.isArray(vendor.services) ? vendor.services : [];
    if (servicesRaw.length === 0) throw new Error("At least one service category is required for vendors");

    const services = servicesRaw.map((item) => {
      if (!item || typeof item !== "object") throw new Error("Invalid vendor service");
      const service = item as Record<string, unknown>;
      const categoryId = String(service.categoryId ?? "").trim();
      const priceType = service.priceType;
      const description = service.description == null ? null : String(service.description).trim();
      const basePriceRaw = service.basePrice;
      const basePrice = basePriceRaw == null || basePriceRaw === "" ? null : Number(basePriceRaw);

      if (!categoryId) throw new Error("Each vendor service must include a category");
      if (priceType !== "fixed" && priceType !== "hourly" && priceType !== "quote") throw new Error("Invalid pricing type");
      if (description && description.length > 500) throw new Error("Service description must be under 500 characters");
      if (priceType !== "quote" && (!Number.isFinite(basePrice) || Number(basePrice) < 0)) {
        throw new Error("Priced services need a valid base price");
      }

      return {
        categoryId,
        priceType,
        basePrice: priceType === "quote" ? null : Number(basePrice),
        description,
      } satisfies VendorServiceInput;
    });

    payload.vendor = {
      businessName,
      bio,
      baseAddress,
      serviceRadiusKm: radiusValue,
      primaryPhone,
      contactNumbers,
      licenseDocPath,
      governmentIdDocPath,
      insuranceDocPath,
      services,
      verificationStatus,
    };
  }

  return payload;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return badRequest("Missing authorization header", 401);

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const [{ data: userData, error: userError }, { data: adminRoles, error: roleError }] = await Promise.all([
      userClient.auth.getUser(token),
      userClient.rpc("get_my_roles"),
    ]);

    if (userError || !userData.user) return badRequest("Unauthorized", 401);
    if (roleError || !(adminRoles ?? []).includes("admin")) return badRequest("Admin access required", 403);

    const payload = parsePayload(await req.json());

    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.fullName,
        phone: payload.phone,
        role: payload.role,
      },
    });

    if (createError || !createdUser.user) {
      return badRequest(createError?.message ?? "Unable to create account", 400);
    }

    const userId = createdUser.user.id;

    const { error: profileError } = await adminClient
      .from("profiles")
      .update({ full_name: payload.fullName, phone: payload.phone ?? null })
      .eq("id", userId);

    if (profileError) throw profileError;

    if (payload.role === "vendor" && payload.vendor) {
      const vendorInsert = {
        user_id: userId,
        business_name: payload.vendor.businessName,
        bio: payload.vendor.bio ?? null,
        phone: payload.vendor.primaryPhone ?? payload.phone ?? null,
        base_address: payload.vendor.baseAddress ?? null,
        service_radius_km: payload.vendor.serviceRadiusKm,
        contact_numbers: payload.vendor.contactNumbers,
        license_doc_path: payload.vendor.licenseDocPath ?? null,
        government_id_doc_path: payload.vendor.governmentIdDocPath ?? null,
        insurance_doc_path: payload.vendor.insuranceDocPath ?? null,
        verification_status: payload.vendor.verificationStatus ?? "pending",
      };

      const { data: vendorRow, error: vendorError } = await adminClient
        .from("vendors")
        .insert(vendorInsert)
        .select("id")
        .single();

      if (vendorError || !vendorRow) throw vendorError ?? new Error("Unable to create vendor profile");

      const { error: servicesError } = await adminClient.from("vendor_services").insert(
        payload.vendor.services.map((service) => ({
          vendor_id: vendorRow.id,
          category_id: service.categoryId,
          price_type: service.priceType,
          base_price: service.basePrice,
          description: service.description,
        })),
      );

      if (servicesError) throw servicesError;
    }

    return new Response(JSON.stringify({ userId, role: payload.role }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return badRequest(message, 500);
  }
});
