DROP FUNCTION IF EXISTS public.search_vendors_for_job(uuid, numeric, numeric);

CREATE FUNCTION public.search_vendors_for_job(_category_id uuid, _lat numeric, _lng numeric)
 RETURNS TABLE(vendor_id uuid, business_name text, bio text, logo_url text, avg_rating numeric, total_jobs integer, is_online boolean, distance_km numeric, base_price numeric, price_type price_type, service_description text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    vs.price_type,
    vs.description as service_description
  from public.vendors v
  join public.vendor_services vs on vs.vendor_id = v.id
  where v.verification_status = 'approved'
    and vs.category_id = _category_id
    and vs.is_active = true
    and v.base_lat is not null
    and v.base_lng is not null
    and public.distance_km(v.base_lat, v.base_lng, _lat, _lng) <= v.service_radius_km
  order by v.is_online desc, distance_km asc;
$function$;