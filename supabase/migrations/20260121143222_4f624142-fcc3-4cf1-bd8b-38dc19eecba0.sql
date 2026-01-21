-- Add UPDATE and DELETE policies for book_categories (admin only)
CREATE POLICY "Admins can update book_categories"
ON public.book_categories
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete book_categories"
ON public.book_categories
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add UPDATE and DELETE policies for book_types (admin only)
CREATE POLICY "Admins can update book_types"
ON public.book_types
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete book_types"
ON public.book_types
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));