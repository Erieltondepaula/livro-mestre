
-- 1. Revoke anon execute on SECURITY DEFINER trigger function
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM anon, public;

-- 2. Add DELETE policies for tables missing them
CREATE POLICY "Users can delete own copilot patterns" ON public.copilot_user_patterns
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reading goals" ON public.reading_goals
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own outline structures" ON public.user_outline_structures
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. Fix profiles UPDATE policy - add WITH CHECK to prevent privilege escalation
DROP POLICY IF EXISTS "Admins and master can manage all profiles" ON public.profiles;
CREATE POLICY "Admins and master can manage all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (is_master_user(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (
    is_master_user(auth.uid())
    OR (has_role(auth.uid(), 'admin'::app_role) AND NOT is_master_user(user_id) AND is_master = false)
  );

-- 4. Add is_user_active check to exegesis-materials storage policies
DROP POLICY IF EXISTS "Users can upload own exegesis materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own exegesis materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own exegesis materials" ON storage.objects;

CREATE POLICY "Users can upload own exegesis materials" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'exegesis-materials'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND public.is_user_active(auth.uid())
  );

CREATE POLICY "Users can view own exegesis materials" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'exegesis-materials'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND public.is_user_active(auth.uid())
  );

CREATE POLICY "Users can delete own exegesis materials" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'exegesis-materials'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND public.is_user_active(auth.uid())
  );
