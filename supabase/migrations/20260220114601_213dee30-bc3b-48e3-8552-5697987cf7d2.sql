-- Remove file size limit from exegesis-materials bucket (set to null = unlimited)
UPDATE storage.buckets 
SET file_size_limit = NULL 
WHERE id = 'exegesis-materials';