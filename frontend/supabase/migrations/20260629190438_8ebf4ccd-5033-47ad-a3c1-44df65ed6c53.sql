
alter table public.referrals
  add constraint referrals_doctor_profile_fk
  foreign key (doctor_id) references public.profiles(id) on delete cascade;

alter table public.referrals
  add constraint referrals_center_profile_fk
  foreign key (center_id) references public.profiles(id) on delete cascade;

alter table public.referrals
  add constraint referrals_patient_profile_fk
  foreign key (patient_id) references public.profiles(id) on delete set null;
