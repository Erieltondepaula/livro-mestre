-- Remove the duplicate restrictive INSERT policy on storage.objects for exegesis-materials
DROP POLICY IF EXISTS "Users can upload exegesis materials" ON storage.objects;