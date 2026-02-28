
CREATE POLICY "Users can delete their own prompt"
ON public.user_sermon_prompts FOR DELETE
USING (auth.uid() = user_id);
