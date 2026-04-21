-- 1. Reviews table
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  customer_id uuid not null,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reviews_vendor on public.reviews(vendor_id);
create index idx_reviews_customer on public.reviews(customer_id);

alter table public.reviews enable row level security;

-- Anyone authenticated can read reviews for approved vendors
create policy "Reviews of approved vendors are viewable"
on public.reviews for select to authenticated
using (
  exists (
    select 1 from public.vendors v
    where v.id = reviews.vendor_id and v.verification_status = 'approved'
  )
);

-- Customers can create a review only for their own completed booking
create policy "Customers can review their completed bookings"
on public.reviews for insert to authenticated
with check (
  auth.uid() = customer_id
  and exists (
    select 1 from public.bookings b
    where b.id = reviews.booking_id
      and b.customer_id = auth.uid()
      and b.vendor_id = reviews.vendor_id
      and b.status = 'completed'
  )
);

create policy "Customers can update their own reviews"
on public.reviews for update to authenticated
using (auth.uid() = customer_id)
with check (auth.uid() = customer_id);

create policy "Customers can delete their own reviews"
on public.reviews for delete to authenticated
using (auth.uid() = customer_id);

create policy "Admins can manage all reviews"
on public.reviews for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

-- 2. Recompute vendor avg_rating + total review aggregates
create or replace function public.recompute_vendor_rating(_vendor_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.vendors v
  set avg_rating = sub.avg_rating
  from (
    select avg(rating)::numeric(3,2) as avg_rating
    from public.reviews
    where vendor_id = _vendor_id
  ) sub
  where v.id = _vendor_id;
$$;

create or replace function public.handle_review_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'DELETE') then
    perform public.recompute_vendor_rating(old.vendor_id);
    return old;
  else
    perform public.recompute_vendor_rating(new.vendor_id);
    if (tg_op = 'UPDATE' and old.vendor_id <> new.vendor_id) then
      perform public.recompute_vendor_rating(old.vendor_id);
    end if;
    return new;
  end if;
end;
$$;

create trigger reviews_aggregate_after_change
after insert or update or delete on public.reviews
for each row execute function public.handle_review_change();

-- 3. Update broadcast policy to gate on vendor.is_online
drop policy if exists "Vendors can view broadcast jobs in their categories" on public.bookings;

create policy "Vendors can view broadcast jobs in their categories"
on public.bookings for select to authenticated
using (
  dispatch_mode = 'broadcast'
  and status = 'requested'
  and vendor_id is null
  and exists (
    select 1 from public.vendors v
    join public.vendor_services vs on vs.vendor_id = v.id
    where v.user_id = auth.uid()
      and v.verification_status = 'approved'
      and v.is_online = true
      and vs.category_id = bookings.category_id
      and vs.is_active = true
  )
);

-- Also gate accept_broadcast_booking on online status
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
  where user_id = auth.uid()
    and verification_status = 'approved'
    and is_online = true
  limit 1;

  if v_vendor.id is null then
    raise exception 'Vendor must be approved and online to accept broadcast jobs';
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

-- 4. Allow vendor self-update of is_online (existing update policy already allows; verification_status is locked by check)
-- No change needed since "Vendors can update their own profile" permits is_online toggling.
