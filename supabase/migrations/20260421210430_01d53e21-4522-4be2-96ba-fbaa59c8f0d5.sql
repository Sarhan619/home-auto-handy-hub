-- Booking status enum
create type public.booking_status as enum (
  'requested',
  'accepted',
  'en_route',
  'in_progress',
  'completed',
  'cancelled',
  'declined',
  'expired'
);

create type public.dispatch_mode as enum ('broadcast', 'direct');

-- Bookings table
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  category_id uuid not null references public.service_categories(id),
  vendor_id uuid references public.vendors(id), -- null until accepted (broadcast) or set on creation (direct)
  dispatch_mode public.dispatch_mode not null default 'broadcast',
  status public.booking_status not null default 'requested',
  job_address text not null,
  job_lat numeric not null,
  job_lng numeric not null,
  notes text,
  scheduled_for timestamptz,
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bookings_customer on public.bookings(customer_id, created_at desc);
create index idx_bookings_vendor on public.bookings(vendor_id, created_at desc);
create index idx_bookings_status_category on public.bookings(status, category_id);

-- updated_at trigger
create trigger trg_bookings_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

-- Lifecycle timestamps trigger
create or replace function public.handle_booking_status_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'accepted' and new.accepted_at is null then
      new.accepted_at := now();
    elsif new.status = 'in_progress' and new.started_at is null then
      new.started_at := now();
    elsif new.status = 'completed' and new.completed_at is null then
      new.completed_at := now();
    elsif new.status in ('cancelled','declined','expired') and new.cancelled_at is null then
      new.cancelled_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_bookings_status
before update on public.bookings
for each row execute function public.handle_booking_status_change();

-- Enable RLS
alter table public.bookings enable row level security;

-- Customers: manage their own bookings
create policy "Customers can view their own bookings"
on public.bookings for select to authenticated
using (auth.uid() = customer_id);

create policy "Customers can create their own bookings"
on public.bookings for insert to authenticated
with check (
  auth.uid() = customer_id
  and public.has_role(auth.uid(), 'customer')
  and status = 'requested'
);

create policy "Customers can cancel their own bookings"
on public.bookings for update to authenticated
using (auth.uid() = customer_id)
with check (auth.uid() = customer_id);

-- Vendors: see broadcast jobs in their categories + their own assigned jobs
create policy "Vendors can view assigned bookings"
on public.bookings for select to authenticated
using (
  exists (
    select 1 from public.vendors v
    where v.id = bookings.vendor_id and v.user_id = auth.uid()
  )
);

create policy "Vendors can view broadcast jobs in their categories"
on public.bookings for select to authenticated
using (
  bookings.dispatch_mode = 'broadcast'
  and bookings.status = 'requested'
  and bookings.vendor_id is null
  and exists (
    select 1
    from public.vendors v
    join public.vendor_services vs on vs.vendor_id = v.id
    where v.user_id = auth.uid()
      and v.verification_status = 'approved'
      and vs.category_id = bookings.category_id
      and vs.is_active = true
  )
);

create policy "Vendors can update their assigned bookings"
on public.bookings for update to authenticated
using (
  exists (
    select 1 from public.vendors v
    where v.id = bookings.vendor_id and v.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.vendors v
    where v.id = bookings.vendor_id and v.user_id = auth.uid()
  )
);

-- Vendor accepts a broadcast job: assign vendor_id and flip status atomically via RPC
create or replace function public.accept_broadcast_booking(_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vendor public.vendors%rowtype;
  v_booking public.bookings%rowtype;
begin
  select * into v_vendor from public.vendors
  where user_id = auth.uid() and verification_status = 'approved'
  limit 1;

  if v_vendor.id is null then
    raise exception 'Not an approved vendor';
  end if;

  update public.bookings
     set vendor_id = v_vendor.id,
         status = 'accepted',
         accepted_at = now()
   where id = _booking_id
     and status = 'requested'
     and dispatch_mode = 'broadcast'
     and vendor_id is null
     and exists (
       select 1 from public.vendor_services vs
       where vs.vendor_id = v_vendor.id
         and vs.category_id = bookings.category_id
         and vs.is_active = true
     )
  returning * into v_booking;

  if v_booking.id is null then
    raise exception 'Booking no longer available';
  end if;

  return v_booking;
end;
$$;

-- Admins
create policy "Admins can view all bookings"
on public.bookings for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage all bookings"
on public.bookings for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Distance helper (Haversine, km)
create or replace function public.distance_km(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
returns numeric
language sql
immutable
as $$
  select (
    6371 * 2 * asin(
      sqrt(
        power(sin(radians(lat2 - lat1) / 2), 2) +
        cos(radians(lat1)) * cos(radians(lat2)) *
        power(sin(radians(lng2 - lng1) / 2), 2)
      )
    )
  )::numeric;
$$;

-- Find approved vendors in a category whose service radius covers the location
create or replace function public.search_vendors_for_job(
  _category_id uuid,
  _lat numeric,
  _lng numeric
)
returns table (
  vendor_id uuid,
  business_name text,
  bio text,
  logo_url text,
  avg_rating numeric,
  total_jobs integer,
  is_online boolean,
  distance_km numeric,
  base_price numeric,
  price_type public.price_type
)
language sql
stable
security definer
set search_path = public
as $$
  select
    v.id as vendor_id,
    v.business_name,
    v.bio,
    v.logo_url,
    v.avg_rating,
    v.total_jobs,
    v.is_online,
    public.distance_km(v.base_lat, v.base_lng, _lat, _lng) as distance_km,
    vs.base_price,
    vs.price_type
  from public.vendors v
  join public.vendor_services vs on vs.vendor_id = v.id
  where v.verification_status = 'approved'
    and vs.category_id = _category_id
    and vs.is_active = true
    and v.base_lat is not null
    and v.base_lng is not null
    and public.distance_km(v.base_lat, v.base_lng, _lat, _lng) <= v.service_radius_km
  order by v.is_online desc, distance_km asc;
$$;

-- Realtime
alter table public.bookings replica identity full;
alter publication supabase_realtime add table public.bookings;