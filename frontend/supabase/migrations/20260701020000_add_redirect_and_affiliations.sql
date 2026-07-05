-- Adds the operational-resilience mechanism (redirect a stalled referral
-- to an alternate provider) and the independent-practitioner affiliation
-- model, without altering any existing table, column, or policy.

-- ─────────────────────────────────────────────────────────────────
-- 1. New referral states
-- ─────────────────────────────────────────────────────────────────
-- Existing values are untouched. 'expired' marks a referral nobody
-- responded to in time. 'redirected' marks a referral that has been
-- superseded by a new one sent to an alternate provider.

alter type public.referral_status add value if not exists 'expired';
alter type public.referral_status add value if not exists 'redirected';

-- ─────────────────────────────────────────────────────────────────
-- 2. Link a redirected referral to the replacement referral it spawned
-- ─────────────────────────────────────────────────────────────────

alter table public.referrals
  add column if not exists redirected_to_referral_id uuid
    references public.referrals(id) on delete set null;

create index if not exists idx_referrals_redirected_to
  on public.referrals(redirected_to_referral_id);

-- ─────────────────────────────────────────────────────────────────
-- 3. Affiliations: independent practitioner <-> medical center
-- ─────────────────────────────────────────────────────────────────
-- A practitioner is not owned by a center. They can be affiliated with
-- zero, one, or several centers. This table is the join, not a rename
-- of any existing structure — doctor_id on referrals still points at
-- auth.users directly, exactly as before.

create table if not exists public.affiliations (
  id uuid primary key default gen_random_uuid(),
  practitioner_user_id uuid not null references auth.users(id) on delete cascade,
  medical_center_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (practitioner_user_id, medical_center_user_id)
);

grant select, insert, update, delete on public.affiliations to authenticated;
grant all on public.affiliations to service_role;

alter table public.affiliations enable row level security;

create policy "Practitioner views own affiliations"
  on public.affiliations for select to authenticated
  using (auth.uid() = practitioner_user_id);

create policy "Center views its own affiliations"
  on public.affiliations for select to authenticated
  using (auth.uid() = medical_center_user_id);

create policy "Center manages affiliations to itself"
  on public.affiliations for insert to authenticated
  with check (
    auth.uid() = medical_center_user_id
    and public.has_role(auth.uid(), 'medical_center')
  );

create policy "Center updates affiliations to itself"
  on public.affiliations for update to authenticated
  using (auth.uid() = medical_center_user_id)
  with check (auth.uid() = medical_center_user_id);

create policy "Center removes affiliations to itself"
  on public.affiliations for delete to authenticated
  using (auth.uid() = medical_center_user_id);

create index if not exists idx_affiliations_practitioner
  on public.affiliations(practitioner_user_id);
create index if not exists idx_affiliations_center
  on public.affiliations(medical_center_user_id);

-- ─────────────────────────────────────────────────────────────────
-- 4. redirect_referral(): the resilience mechanism
-- ─────────────────────────────────────────────────────────────────
-- Marks the stalled referral as 'redirected', creates a fresh referral
-- carrying the same patient and clinical reason to a new doctor and/or
-- center, links old -> new, and returns the new referral's id.
-- Only the center currently holding the referral, or the referring
-- doctor, may trigger a redirect.

create or replace function public.redirect_referral(
  p_referral_id uuid,
  p_new_center_id uuid,
  p_new_doctor_id uuid default null, -- null keeps the original referring doctor
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.referrals%rowtype;
  new_id uuid;
  target_doctor uuid;
begin
  select * into r from public.referrals where id = p_referral_id for update;

  if r.id is null then
    raise exception 'Referral % not found', p_referral_id;
  end if;

  if auth.uid() <> r.doctor_id and auth.uid() <> r.center_id then
    raise exception 'Not authorized to redirect this referral';
  end if;

  if r.status in ('completed', 'cancelled', 'redirected') then
    raise exception 'Referral in status % cannot be redirected', r.status;
  end if;

  target_doctor := coalesce(p_new_doctor_id, r.doctor_id);

  insert into public.referrals (
    doctor_id, center_id, patient_id, patient_name, patient_phone,
    patient_dob, specialty_needed, reason, clinical_notes, urgency,
    status
  ) values (
    target_doctor, p_new_center_id, r.patient_id, r.patient_name,
    r.patient_phone, r.patient_dob, r.specialty_needed, r.reason,
    coalesce(r.clinical_notes, '') ||
      case when p_note is not null then E'\n\n[Redirected] ' || p_note else '' end,
    r.urgency, 'pending'
  )
  returning id into new_id;

  update public.referrals
    set status = 'redirected', redirected_to_referral_id = new_id
    where id = p_referral_id;

  insert into public.notifications (user_id, type, title, message, link)
  values (
    p_new_center_id, 'referral_created', 'Referral redirected to you',
    'A referral for ' || r.patient_name || ' was redirected to your center.',
    '/referrals'
  );

  return new_id;
end;
$$;

revoke execute on function public.redirect_referral(uuid, uuid, uuid, text)
  from public, anon;
grant execute on function public.redirect_referral(uuid, uuid, uuid, text)
  to authenticated;
