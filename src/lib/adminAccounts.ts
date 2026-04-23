export type AccountRole = "customer" | "vendor";
export type VendorPriceType = "fixed" | "hourly" | "quote";

export type AdminCreateVendorService = {
  categoryId: string;
  priceType: VendorPriceType;
  basePrice: number | null;
  description: string | null;
};

export type AdminCreateCustomerPayload = {
  role: "customer";
  fullName: string;
  email: string;
  phone: string | null;
  password: string;
};

export type AdminCreateVendorPayload = {
  role: "vendor";
  fullName: string;
  email: string;
  phone: string | null;
  password: string;
  vendor: {
    businessName: string;
    bio: string | null;
    baseAddress: string;
    serviceRadiusKm: number;
    primaryPhone: string;
    contactNumbers: string[];
    licenseDocPath: string | null;
    governmentIdDocPath: string | null;
    insuranceDocPath: string | null;
    services: AdminCreateVendorService[];
    verificationStatus: "pending";
  };
};

export type AdminCreateAccountPayload = AdminCreateCustomerPayload | AdminCreateVendorPayload;
