
DROP POLICY IF EXISTS "Authenticated users can upload book covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update book covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete book covers" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for book covers" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

CREATE POLICY "Users can upload own book covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'book-covers' AND (auth.uid())::text = (storage.foldername(name))[1] AND is_user_active(auth.uid()));

CREATE POLICY "Users can update own book covers"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'book-covers' AND (auth.uid())::text = (storage.foldername(name))[1] AND is_user_active(auth.uid()));

CREATE POLICY "Users can delete own book covers"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'book-covers' AND (auth.uid())::text = (storage.foldername(name))[1] AND is_user_active(auth.uid()));

CREATE POLICY "Owners can list own book covers"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'book-covers' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can list own avatars"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_master_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.is_master IS DISTINCT FROM OLD.is_master OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Not allowed to modify privileged fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

CREATE POLICY "Users can update own outline versions"
ON public.exegesis_outline_versions FOR UPDATE
USING (auth.uid() = user_id AND is_user_active(auth.uid()))
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own note book links"
ON public.note_book_links FOR UPDATE
USING (auth.uid() = user_id AND is_user_active(auth.uid()))
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own note links"
ON public.note_links FOR UPDATE
USING (auth.uid() = user_id AND is_user_active(auth.uid()))
WITH CHECK (auth.uid() = user_id);

REVOKE EXECUTE ON FUNCTION public.is_master_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_user_active(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_note_backlinks(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_master_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_active(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_note_backlinks(uuid) TO authenticated;
