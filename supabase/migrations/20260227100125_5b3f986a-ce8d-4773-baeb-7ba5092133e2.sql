-- 1. Remove hardcoded email from profiles RLS policy
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins and master can manage all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (is_master_user(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- 2. Remove hardcoded email from subscriptions RLS policy
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Master and admins can manage all subscriptions"
  ON public.subscriptions
  FOR ALL
  TO authenticated
  USING (is_master_user(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_master_user(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- 3. Secure book-covers storage bucket (require authentication for writes)
DROP POLICY IF EXISTS "Public upload access for book covers" ON storage.objects;
DROP POLICY IF EXISTS "Public update access for book covers" ON storage.objects;
DROP POLICY IF EXISTS "Public delete access for book covers" ON storage.objects;

CREATE POLICY "Authenticated users can upload book covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'book-covers' AND is_user_active(auth.uid()));

CREATE POLICY "Authenticated users can update book covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'book-covers' AND is_user_active(auth.uid()));

CREATE POLICY "Authenticated users can delete book covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'book-covers' AND is_user_active(auth.uid()));