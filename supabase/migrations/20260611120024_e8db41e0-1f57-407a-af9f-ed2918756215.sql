
-- Tighten WITH CHECK on user self-update to prevent privilege escalation
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND is_master = false
  AND is_active = true
);

-- Tighten admin update policy to block elevating users to master
DROP POLICY IF EXISTS "Admins can update non-master profiles" ON public.profiles;
CREATE POLICY "Admins can update non-master profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND NOT is_master_user(user_id))
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND NOT is_master_user(user_id)
  AND is_master = false
);

-- Defense-in-depth: strengthen trigger so non-master/non-admin cannot change privileged fields
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Master can change anything
  IF public.is_master_user(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Admins can toggle is_active on non-master profiles only, never grant master
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    IF NEW.is_master IS DISTINCT FROM OLD.is_master THEN
      RAISE EXCEPTION 'Only master users can modify is_master';
    END IF;
    RETURN NEW;
  END IF;

  -- Regular users cannot modify privileged fields
  IF NEW.is_master IS DISTINCT FROM OLD.is_master
     OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Not allowed to modify privileged fields';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();
