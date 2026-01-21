-- Fix book_types and book_categories policies to be more restrictive
DROP POLICY IF EXISTS "Authenticated users can insert book_types" ON public.book_types;
DROP POLICY IF EXISTS "Authenticated users can insert book_categories" ON public.book_categories;

-- Only admins can add new types and categories
CREATE POLICY "Admins can insert book_types"
  ON public.book_types FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert book_categories"
  ON public.book_categories FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));