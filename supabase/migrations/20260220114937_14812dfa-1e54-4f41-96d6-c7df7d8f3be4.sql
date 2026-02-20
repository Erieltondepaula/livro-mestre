-- Increase file size limit to 500MB for exegesis-materials bucket
UPDATE storage.buckets 
SET file_size_limit = 524288000
WHERE id = 'exegesis-materials';

-- Also ensure the bucket allows pdf, doc, docx mime types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
WHERE id = 'exegesis-materials';