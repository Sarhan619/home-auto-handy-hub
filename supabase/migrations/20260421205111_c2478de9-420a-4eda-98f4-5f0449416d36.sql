-- Enums
create type public.verification_status as enum ('pending', 'approved', 'rejected');
create type public.price_type as enum ('fixed', 'hourly', 'quote');

-- Service categories
create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text,
  description text,
  default_commission_pct numeric(5,2) not null default 15.00,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.service_categories enable row level security;

create policy "Anyone authenticated can view active categories"
  on public.service_categories for select
  to authenticated
  using (is_active = true);

create policy "Admins can manage categories"
  on public.service_categories for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Seed default categories
insert into public.service_categories (name, slug, icon, description) values
  ('Car Wash', 'car-wash', 'Droplets', 'Mobile and on-site car wash & detailing'),
  ('Lawn Care', 'lawn-care', 'Trees', 'Mowing, trimming, and yard maintenance'),
  ('Towing', 'towing', 'Truck', 'Roadside towing and recovery'),
  ('Roofing', 'roofing', 'Home', 'Roof repair, inspection, and replacement'),
  ('Auto Repair', 'auto-repair', 'Car', 'Mobile mechanic and auto repair'),
  ('Handyman', 'handyman', 'Wrench', 'General home repairs and odd jobs');

-- Vendors
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  business_name text not null,
  bio text,
  logo_url text,
  phone text,
  service_radius_km numeric(6,2) not null default 25,
  base_address text,
  base_lat numeric(9,6),
  base_lng numeric(9,6),
  verification_status public.verification_status not null default 'pending',
  rejection_reason text,
  is_online boolean not null default false,
  avg_rating numeric(3,2),
  total_jobs integer not null default 0,
  license_doc_path text,
  insurance_doc_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vendors enable row level security;

create policy "Vendors can view their own profile"
  on public.vendors for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Anyone authenticated can view approved vendors"
  on public.vendors for select
  to authenticated
  using (verification_status = 'approved');

create policy "Admins can view all vendors"
  on public.vendors for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Vendors can insert their own profile"
  on public.vendors for insert
  to authenticated
  with check (auth.uid() = user_id and public.has_role(auth.uid(), 'vendor'));

create policy "Vendors can update their own profile"
  on public.vendors for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and verification_status = (select verification_status from public.vendors where user_id = auth.uid()));

create policy "Admins can manage all vendors"
  on public.vendors for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger vendors_set_updated_at
  before update on public.vendors
  for each row execute function public.set_updated_at();

create index idx_vendors_status on public.vendors(verification_status);

-- Vendor services
create table public.vendor_services (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  category_id uuid not null references public.service_categories(id) on delete restrict,
  price_type public.price_type not null default 'quote',
  base_price numeric(10,2),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (vendor_id, category_id)
);

alter table public.vendor_services enable row level security;

create policy "Vendors can view their own services"
  on public.vendor_services for select
  to authenticated
  using (exists (select 1 from public.vendors v where v.id = vendor_id and v.user_id = auth.uid()));

create policy "Anyone authenticated can view services of approved vendors"
  on public.vendor_services for select
  to authenticated
  using (exists (select 1 from public.vendors v where v.id = vendor_id and v.verification_status = 'approved'));

create policy "Admins can view all vendor services"
  on public.vendor_services for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Vendors can manage their own services"
  on public.vendor_services for all
  to authenticated
  using (exists (select 1 from public.vendors v where v.id = vendor_id and v.user_id = auth.uid()))
  with check (exists (select 1 from public.vendors v where v.id = vendor_id and v.user_id = auth.uid()));

create policy "Admins can manage all vendor services"
  on public.vendor_services for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for vendor documents (private)
insert into storage.buckets (id, name, public)
values ('vendor-documents', 'vendor-documents', false)
on conflict (id) do nothing;

create policy "Vendors can upload to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vendor-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Vendors can view their own documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'vendor-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Vendors can update their own documents"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'vendor-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Vendors can delete their own documents"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'vendor-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Admins can view all vendor documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'vendor-documents'
    and public.has_role(auth.uid(), 'admin')
  );