-- Add INSERT policy for exegesis-materials bucket
CREATE POLICY "Users can upload exegesis materials"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'exegesis-materials' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);