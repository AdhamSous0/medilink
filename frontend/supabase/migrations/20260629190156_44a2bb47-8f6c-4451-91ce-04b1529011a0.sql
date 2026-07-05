
create or replace function public.list_medical_centers()
returns table (
  id uuid,
  organization_name text,
  provider_type public.provider_type,
  address text,
  phone text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.organization_name, p.provider_type, p.address, p.phone
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  where ur.role = 'medical_center'
  order by p.organization_name nulls last;
$$;

revoke execute on function public.list_medical_centers() from public, anon;
grant execute on function public.list_medical_centers() to authenticated;
