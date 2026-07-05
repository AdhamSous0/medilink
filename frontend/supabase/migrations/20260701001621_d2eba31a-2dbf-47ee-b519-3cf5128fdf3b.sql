
create table public.referral_messages (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index referral_messages_referral_idx on public.referral_messages(referral_id, created_at);

grant select, insert on public.referral_messages to authenticated;
grant all on public.referral_messages to service_role;

alter table public.referral_messages enable row level security;

create policy "Participants can read messages"
on public.referral_messages for select to authenticated
using (
  exists (
    select 1 from public.referrals r
    where r.id = referral_id
      and (auth.uid() = r.doctor_id or auth.uid() = r.center_id or auth.uid() = r.patient_id)
  )
);

create policy "Participants can send messages"
on public.referral_messages for insert to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.referrals r
    where r.id = referral_id
      and (auth.uid() = r.doctor_id or auth.uid() = r.center_id or auth.uid() = r.patient_id)
  )
);

create or replace function public.notify_on_referral_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare r public.referrals%rowtype;
        sender_name text;
begin
  select * into r from public.referrals where id = new.referral_id;
  select coalesce(full_name, email, 'A participant') into sender_name
    from public.profiles where id = new.sender_id;

  if r.doctor_id is not null and r.doctor_id <> new.sender_id then
    insert into public.notifications (user_id, type, title, message, link)
    values (r.doctor_id, 'message_received', 'New message on referral',
      sender_name || ': ' || left(new.body, 120), '/referrals/' || r.id::text);
  end if;
  if r.center_id is not null and r.center_id <> new.sender_id then
    insert into public.notifications (user_id, type, title, message, link)
    values (r.center_id, 'message_received', 'New message on referral',
      sender_name || ': ' || left(new.body, 120), '/referrals/' || r.id::text);
  end if;
  if r.patient_id is not null and r.patient_id <> new.sender_id then
    insert into public.notifications (user_id, type, title, message, link)
    values (r.patient_id, 'message_received', 'New message on referral',
      sender_name || ': ' || left(new.body, 120), '/referrals/' || r.id::text);
  end if;
  return new;
end $$;

create trigger trg_notify_on_referral_message
  after insert on public.referral_messages
  for each row execute function public.notify_on_referral_message();

alter table public.referral_messages replica identity full;
alter publication supabase_realtime add table public.referral_messages;
