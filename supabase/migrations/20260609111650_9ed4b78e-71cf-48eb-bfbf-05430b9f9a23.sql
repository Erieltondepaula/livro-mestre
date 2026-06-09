ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS levels_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS achievements_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cycles_enabled boolean NOT NULL DEFAULT true;