-- Adicionar política para permitir que o Mestre exclua perfis de outros usuários
CREATE POLICY "Master can delete non-master profiles"
ON public.profiles
FOR DELETE
USING (
  is_master_user(auth.uid()) 
  AND NOT is_master_user(user_id)
);

-- Adicionar política para permitir que o Mestre exclua roles de usuários não-master
CREATE POLICY "Master can delete non-master user roles"
ON public.user_roles
FOR DELETE
USING (
  is_master_user(auth.uid())
  AND NOT is_master_user(user_id)
);

-- Adicionar política para permitir que o Mestre exclua permissões de usuários não-master
CREATE POLICY "Master can delete non-master user permissions"
ON public.user_permissions
FOR DELETE
USING (
  is_master_user(auth.uid())
  AND NOT is_master_user(user_id)
);