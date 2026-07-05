
create policy "medical_files_read_involved"
on storage.objects for select to authenticated
using (
  bucket_id = 'medical-files'
  and exists (
    select 1 from public.referrals r
    where r.id::text = split_part(name, '/', 2)
      and (auth.uid() = r.doctor_id or auth.uid() = r.center_id or auth.uid() = r.patient_id)
  )
);

create policy "medical_files_upload_doctor_or_center"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'medical-files'
  and exists (
    select 1 from public.referrals r
    where r.id::text = split_part(name, '/', 2)
      and (auth.uid() = r.doctor_id or auth.uid() = r.center_id)
  )
);

create policy "medical_files_delete_owner"
on storage.objects for delete to authenticated
using (bucket_id = 'medical-files' and owner = auth.uid());
