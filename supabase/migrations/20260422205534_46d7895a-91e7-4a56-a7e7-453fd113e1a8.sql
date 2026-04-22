ALTER TABLE public.bookings
ADD COLUMN customer_name text,
ADD COLUMN customer_phone text;

UPDATE public.bookings b
SET customer_name = NULLIF(p.full_name, ''),
    customer_phone = NULLIF(p.phone, '')
FROM public.profiles p
WHERE p.id = b.customer_id
  AND (b.customer_name IS NULL OR b.customer_phone IS NULL);