
do $$ begin
  create type public.referral_status as enum (
    'pending','accepted','rejected','scheduled','in_progress','completed','cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.referral_urgency as enum ('routine','urgent','emergency');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum (
    'referral_created','referral_status_changed','appointment_scheduled','report_uploaded','generic'
  );
exception when duplicate_object then null; end $$;

create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

-- REFERRALS
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references auth.users(id) on delete cascade,
  center_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid references auth.users(id) on delete set null,
  patient_name text not null,
  patient_phone text,
  patient_dob date,
  specialty_needed text,
  reason text not null,
  clinical_notes text,
  urgency public.referral_urgency not null default 'routine',
  status public.referral_status not null default 'pending',
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.referrals to authenticated;
grant all on public.referrals to service_role;
alter table public.referrals enable row level security;

create policy "Doctors create their own referrals" on public.referrals
for insert to authenticated
with check (auth.uid() = doctor_id and public.has_role(auth.uid(), 'doctor'));

create policy "Involved parties can view referral" on public.referrals
for select to authenticated
using (auth.uid() = doctor_id or auth.uid() = center_id or auth.uid() = patient_id);

create policy "Doctor can update own referral" on public.referrals
for update to authenticated
using (auth.uid() = doctor_id) with check (auth.uid() = doctor_id);

create policy "Center can update assigned referral" on public.referrals
for update to authenticated
using (auth.uid() = center_id) with check (auth.uid() = center_id);

create policy "Doctor can delete own pending referral" on public.referrals
for delete to authenticated
using (auth.uid() = doctor_id and status = 'pending');

drop trigger if exists trg_referrals_updated_at on public.referrals;
create trigger trg_referrals_updated_at before update on public.referrals
for each row execute function public.update_updated_at_column();

create index if not exists idx_referrals_doctor on public.referrals(doctor_id);
create index if not exists idx_referrals_center on public.referrals(center_id);
create index if not exists idx_referrals_patient on public.referrals(patient_id);
create index if not exists idx_referrals_status on public.referrals(status);

-- APPOINTMENTS
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 30,
  location text,
  notes text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.appointments to authenticated;
grant all on public.appointments to service_role;
alter table public.appointments enable row level security;

create policy "Involved parties view appointment" on public.appointments
for select to authenticated
using (exists (select 1 from public.referrals r where r.id = appointments.referral_id
  and (auth.uid() = r.doctor_id or auth.uid() = r.center_id or auth.uid() = r.patient_id)));

create policy "Center creates appointment for own referral" on public.appointments
for insert to authenticated
with check (auth.uid() = created_by and exists (
  select 1 from public.referrals r where r.id = referral_id and auth.uid() = r.center_id));

create policy "Center updates appointment" on public.appointments
for update to authenticated
using (exists (select 1 from public.referrals r where r.id = referral_id and auth.uid() = r.center_id))
with check (exists (select 1 from public.referrals r where r.id = referral_id and auth.uid() = r.center_id));

create policy "Center deletes appointment" on public.appointments
for delete to authenticated
using (exists (select 1 from public.referrals r where r.id = referral_id and auth.uid() = r.center_id));

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at before update on public.appointments
for each row execute function public.update_updated_at_column();

create index if not exists idx_appointments_referral on public.appointments(referral_id);
create index if not exists idx_appointments_scheduled on public.appointments(scheduled_at);

-- REFERRAL ATTACHMENTS
create table if not exists public.referral_attachments (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  label text,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.referral_attachments to authenticated;
grant all on public.referral_attachments to service_role;
alter table public.referral_attachments enable row level security;

create policy "Involved parties view attachments" on public.referral_attachments
for select to authenticated
using (exists (select 1 from public.referrals r where r.id = referral_id
  and (auth.uid() = r.doctor_id or auth.uid() = r.center_id or auth.uid() = r.patient_id)));

create policy "Doctor or center uploads attachment" on public.referral_attachments
for insert to authenticated
with check (auth.uid() = uploaded_by and exists (
  select 1 from public.referrals r where r.id = referral_id
  and (auth.uid() = r.doctor_id or auth.uid() = r.center_id)));

create policy "Uploader deletes own attachment" on public.referral_attachments
for delete to authenticated using (auth.uid() = uploaded_by);

create index if not exists idx_attachments_referral on public.referral_attachments(referral_id);

-- REPORTS
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;

create policy "Involved parties view reports" on public.reports
for select to authenticated
using (exists (select 1 from public.referrals r where r.id = referral_id
  and (auth.uid() = r.doctor_id or auth.uid() = r.center_id or auth.uid() = r.patient_id)));

create policy "Center uploads reports" on public.reports
for insert to authenticated
with check (auth.uid() = uploaded_by and exists (
  select 1 from public.referrals r where r.id = referral_id and auth.uid() = r.center_id));

create policy "Center updates own reports" on public.reports
for update to authenticated using (auth.uid() = uploaded_by) with check (auth.uid() = uploaded_by);

create policy "Center deletes own reports" on public.reports
for delete to authenticated using (auth.uid() = uploaded_by);

drop trigger if exists trg_reports_updated_at on public.reports;
create trigger trg_reports_updated_at before update on public.reports
for each row execute function public.update_updated_at_column();

create index if not exists idx_reports_referral on public.reports(referral_id);

-- NOTIFICATIONS
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.notification_type not null default 'generic',
  title text not null,
  message text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

create policy "Users read own notifications" on public.notifications
for select to authenticated using (auth.uid() = user_id);

create policy "Users update own notifications" on public.notifications
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users delete own notifications" on public.notifications
for delete to authenticated using (auth.uid() = user_id);

create index if not exists idx_notifications_user on public.notifications(user_id, read);

-- Auto-notification triggers
create or replace function public.notify_on_referral_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, title, message, link)
  values (new.center_id, 'referral_created', 'New referral received',
    'A new referral for ' || new.patient_name || ' was sent to you.', '/referrals');
  if new.patient_id is not null then
    insert into public.notifications (user_id, type, title, message, link)
    values (new.patient_id, 'referral_created', 'New referral created',
      'Your doctor created a referral on your behalf.', '/referrals');
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_referral_insert on public.referrals;
create trigger trg_notify_referral_insert after insert on public.referrals
for each row execute function public.notify_on_referral_insert();

create or replace function public.notify_on_referral_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications (user_id, type, title, message, link)
    values (old.doctor_id, 'referral_status_changed', 'Referral status updated',
      'Status changed to ' || new.status::text || ' for ' || new.patient_name || '.', '/referrals');
    if new.patient_id is not null then
      insert into public.notifications (user_id, type, title, message, link)
      values (new.patient_id, 'referral_status_changed', 'Your referral was updated',
        'Status: ' || new.status::text, '/referrals');
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_referral_status on public.referrals;
create trigger trg_notify_referral_status after update on public.referrals
for each row execute function public.notify_on_referral_status();

create or replace function public.notify_on_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
declare r public.referrals%rowtype;
begin
  select * into r from public.referrals where id = new.referral_id;
  insert into public.notifications (user_id, type, title, message, link)
  values (r.doctor_id, 'appointment_scheduled', 'Appointment scheduled',
    'Appointment for ' || r.patient_name || ' on ' || to_char(new.scheduled_at, 'YYYY-MM-DD HH24:MI'), '/appointments');
  if r.patient_id is not null then
    insert into public.notifications (user_id, type, title, message, link)
    values (r.patient_id, 'appointment_scheduled', 'New appointment',
      'Scheduled for ' || to_char(new.scheduled_at, 'YYYY-MM-DD HH24:MI'), '/appointments');
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_appointment on public.appointments;
create trigger trg_notify_appointment after insert on public.appointments
for each row execute function public.notify_on_appointment();

create or replace function public.notify_on_report()
returns trigger language plpgsql security definer set search_path = public as $$
declare r public.referrals%rowtype;
begin
  select * into r from public.referrals where id = new.referral_id;
  insert into public.notifications (user_id, type, title, message, link)
  values (r.doctor_id, 'report_uploaded', 'New report available',
    'A report was uploaded for ' || r.patient_name || '.', '/referrals');
  if r.patient_id is not null then
    insert into public.notifications (user_id, type, title, message, link)
    values (r.patient_id, 'report_uploaded', 'Your report is ready', new.title, '/referrals');
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_report on public.reports;
create trigger trg_notify_report after insert on public.reports
for each row execute function public.notify_on_report();
