-- Create user_permissions table to store module access permissions
CREATE TABLE public.user_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    module_key text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, module_key)
);

-- Enable Row Level Security
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_permissions
CREATE POLICY "Users can view own permissions"
ON public.user_permissions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all permissions"
ON public.user_permissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage non-master user permissions"
ON public.user_permissions
FOR ALL
USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND NOT is_master_user(user_id)
)
WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) 
    AND NOT is_master_user(user_id)
);

-- Master users have all permissions by default (handled in application logic)
-- Create index for faster lookups
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);