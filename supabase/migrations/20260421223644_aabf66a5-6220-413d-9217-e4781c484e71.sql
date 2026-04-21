-- 1. Payment method enum
create type public.payment_method as enum ('cash', 'bank_transfer', 'card_on_site', 'other');
create type public.commission_status as enum ('owed', 'settled');

-- 2. Extend bookings
alter table public.bookings
  add column quoted_price numeric(10,2),
  add column final_price numeric(10,2),
  add column price_adjustment_note text,
  add column commission_pct numeric(5,2),
  add column payment_method public.payment_method,
  add column is_paid boolean not null default false,
  add column paid_at timestamptz;

-- 3. Commissions ledger
create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  gross_amount numeric(10,2) not null,
  commission_pct numeric(5,2) not null,
  commission_amount numeric(10,2) not null,
  vendor_net numeric(10,2) not null,
  status public.commission_status not null default 'owed',
  settled_at timestamptz,
  settled_by uuid,
  settlement_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_commissions_vendor on public.commissions(vendor_id);
create index idx_commissions_status on public.commissions(status);

alter table public.commissions enable row level security;

create policy "Vendors view their own commissions"
on public.commissions for select to authenticated
using (
  exists (
    select 1 from public.vendors v
    where v.id = commissions.vendor_id and v.user_id = auth.uid()
  )
);

create policy "Admins view all commissions"
on public.commissions for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins manage commissions"
on public.commissions for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create trigger commissions_set_updated_at
before update on public.commissions
for each row execute function public.set_updated_at();

-- 4. Snapshot commission_pct & quoted_price at booking creation
create or replace function public.set_booking_snapshots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pct numeric(5,2);
begin
  -- Snapshot category commission percentage
  if new.commission_pct is null then
    select default_commission_pct into v_pct
    from public.service_categories
    where id = new.category_id;
    new.commission_pct := coalesce(v_pct, 15.00);
  end if;
  return new;
end;
$$;

create trigger bookings_snapshot_before_insert
before insert on public.bookings
for each row execute function public.set_booking_snapshots();

-- 5. Auto-create commission row when booking completes (only if final_price set & vendor assigned)
create or replace function public.handle_booking_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gross numeric(10,2);
  v_commission numeric(10,2);
  v_pct numeric(5,2);
begin
  if new.status = 'completed'
     and (old.status is distinct from 'completed')
     and new.vendor_id is not null
     and new.final_price is not null
     and new.final_price > 0 then

    v_gross := new.final_price;
    v_pct := coalesce(new.commission_pct, 15.00);
    v_commission := round(v_gross * v_pct / 100.0, 2);

    insert into public.commissions (
      booking_id, vendor_id, gross_amount, commission_pct, commission_amount, vendor_net
    ) values (
      new.id, new.vendor_id, v_gross, v_pct, v_commission, v_gross - v_commission
    )
    on conflict (booking_id) do nothing;
  end if;

  -- Cleanup unsettled commission if booking gets cancelled
  if new.status in ('cancelled','declined','expired')
     and old.status = 'completed' then
    delete from public.commissions
    where booking_id = new.id and status = 'owed';
  end if;

  return new;
end;
$$;

create trigger bookings_after_status_change
after update of status on public.bookings
for each row execute function public.handle_booking_completion();

-- 6. Helper function for vendor to set/adjust price + payment method on their assigned booking
create or replace function public.vendor_set_booking_payment(
  _booking_id uuid,
  _final_price numeric,
  _payment_method public.payment_method,
  _adjustment_note text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings where id = _booking_id;
  if v_booking.id is null then
    raise exception 'Booking not found';
  end if;

  -- Must be the assigned vendor
  if not exists (
    select 1 from public.vendors v
    where v.id = v_booking.vendor_id and v.user_id = auth.uid()
  ) then
    raise exception 'Only the assigned vendor can set payment details';
  end if;

  if _final_price is null or _final_price <= 0 then
    raise exception 'Final price must be greater than zero';
  end if;

  -- If adjusting away from quoted price, a note is required
  if v_booking.quoted_price is not null
     and _final_price <> v_booking.quoted_price
     and (_adjustment_note is null or length(trim(_adjustment_note)) = 0) then
    raise exception 'A note is required when adjusting the quoted price';
  end if;

  update public.bookings
     set final_price = _final_price,
         payment_method = _payment_method,
         price_adjustment_note = case
           when v_booking.quoted_price is not null and _final_price <> v_booking.quoted_price
             then _adjustment_note
           else price_adjustment_note
         end,
         is_paid = true,
         paid_at = now()
   where id = _booking_id
   returning * into v_booking;

  return v_booking;
end;
$$;
