DROP POLICY IF EXISTS "Admins can view public profile data" ON public.profiles;
CREATE POLICY "Users and admins can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id) OR is_master_user(auth.uid()) OR has_role(auth.uid(), 'admin'));