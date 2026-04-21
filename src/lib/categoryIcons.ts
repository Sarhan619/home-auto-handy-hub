import { Car, Droplets, Trees, Truck, Home as HomeIcon, Wrench, type LucideIcon } from "lucide-react";

const map: Record<string, LucideIcon> = {
  "car-wash": Droplets,
  "lawn-care": Trees,
  towing: Truck,
  roofing: HomeIcon,
  "auto-repair": Car,
  handyman: Wrench,
};

export function iconForCategory(slug: string): LucideIcon {
  return map[slug] ?? Wrench;
}