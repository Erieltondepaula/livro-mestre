-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_master BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- 4. Add user_id column to all existing tables
ALTER TABLE public.books ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.readings ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.statuses ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.evaluations ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.quotes ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.vocabulary ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 6. Create function to check if user is active
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND is_active = true
  )
$$;

-- 7. Create function to check if user is master (cannot be modified)
CREATE OR REPLACE FUNCTION public.is_master_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND is_master = true
  )
$$;

-- 8. Enable RLS on new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 9. Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all on books" ON public.books;
DROP POLICY IF EXISTS "Allow all on readings" ON public.readings;
DROP POLICY IF EXISTS "Allow all on statuses" ON public.statuses;
DROP POLICY IF EXISTS "Allow all on evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Allow all on quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow all on vocabulary" ON public.vocabulary;

-- 10. Create RLS policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND NOT public.is_master_user(user_id))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update non-master profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND NOT public.is_master_user(user_id))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND NOT public.is_master_user(user_id));

CREATE POLICY "System can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 11. Create RLS policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage non-master user roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND NOT public.is_master_user(user_id))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND NOT public.is_master_user(user_id));

-- 12. Create RLS policies for books (user isolation)
CREATE POLICY "Users can view own books"
  ON public.books FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND public.is_user_active(auth.uid()));

CREATE POLICY "Users can insert own books"
  ON public.books FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_user_active(auth.uid()));

CREATE POLICY "Users can update own books"
  ON public.books FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND public.is_user_active(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own books"
  ON public.books FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND public.is_user_active(auth.uid()));

-- 13. Create RLS policies for readings
CREATE POLICY "Users can view own readings"
  ON public.readings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND public.is_user_active(auth.uid()));

CREATE POLICY "Users can insert own readings"
  ON public.readings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_user_active(auth.uid()));

CREATE POLICY "Users can update own readings"
  ON public.readings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND public.is_user_active(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own readings"
  ON public.readings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND public.is_user_active(auth.uid()));

-- 14. Create RLS policies for statuses
CREATE POLICY "Users can view own statuses"
  ON public.statuses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND public.is_user_active(auth.uid()));

CREATE POLICY "Users can insert own statuses"
  ON public.statuses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_user_active(auth.uid()));

CREATE POLICY "Users can update own statuses"
  ON public.statuses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND public.is_user_active(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own statuses"
  ON public.statuses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND public.is_user_active(auth.uid()));

-- 15. Create RLS policies for evaluations
CREATE POLICY "Users can view own evaluations"
  ON public.evaluations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND public.is_user_active(auth.uid()));

CREATE POLICY "Users can insert own evaluations"
  ON public.evaluations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_user_active(auth.uid()));

CREATE POLICY "Users can update own evaluations"
  ON public.evaluations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND public.is_user_active(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own evaluations"
  ON public.evaluations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND public.is_user_active(auth.uid()));

-- 16. Create RLS policies for quotes
CREATE POLICY "Users can view own quotes"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND public.is_user_active(auth.uid()));

CREATE POLICY "Users can insert own quotes"
  ON public.quotes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_user_active(auth.uid()));

CREATE POLICY "Users can update own quotes"
  ON public.quotes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND public.is_user_active(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own quotes"
  ON public.quotes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND public.is_user_active(auth.uid()));

-- 17. Create RLS policies for vocabulary
CREATE POLICY "Users can view own vocabulary"
  ON public.vocabulary FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND public.is_user_active(auth.uid()));

CREATE POLICY "Users can insert own vocabulary"
  ON public.vocabulary FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_user_active(auth.uid()));

CREATE POLICY "Users can update own vocabulary"
  ON public.vocabulary FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND public.is_user_active(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vocabulary"
  ON public.vocabulary FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND public.is_user_active(auth.uid()));

-- 18. Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 19. Create trigger for updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 20. RLS for book_types and book_categories (shared resources)
DROP POLICY IF EXISTS "Allow all on book_types" ON public.book_types;
DROP POLICY IF EXISTS "Allow all on book_categories" ON public.book_categories;

CREATE POLICY "Authenticated users can view book_types"
  ON public.book_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert book_types"
  ON public.book_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view book_categories"
  ON public.book_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert book_categories"
  ON public.book_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);