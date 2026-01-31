-- Create bucket if not exists
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Remove existing policies to avoid conflicts
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Auth Upload" on storage.objects;
drop policy if exists "Owner Delete" on storage.objects;

-- Policy: Public can view images
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'product-images' );

-- Policy: Authenticated users can upload
create policy "Auth Upload"
  on storage.objects for insert
  with check ( bucket_id = 'product-images' and auth.role() = 'authenticated' );

-- Policy: Users can update their own uploads (optional, simplistic version)
create policy "Auth Update"
  on storage.objects for update
  using ( bucket_id = 'product-images' and auth.role() = 'authenticated' );

-- Policy: Users can delete their own uploads
create policy "Auth Delete"
  on storage.objects for delete
  using ( bucket_id = 'product-images' and auth.role() = 'authenticated' );
