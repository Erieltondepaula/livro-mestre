import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NotificationPrefs {
  goals_enabled: boolean;
  reminders_enabled: boolean;
  levels_enabled: boolean;
  achievements_enabled: boolean;
  cycles_enabled: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  goals_enabled: false,
  reminders_enabled: false,
  levels_enabled: false,
  achievements_enabled: false,
  cycles_enabled: false,
};

export function useNotificationPrefs() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('notification_preferences')
        .select('goals_enabled, reminders_enabled, levels_enabled, achievements_enabled, cycles_enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      if (mounted) {
        if (data) setPrefs({ ...DEFAULT_PREFS, ...data });
        setLoaded(true);
      }
    })();

    // Listen for cross-component updates
    const handler = () => {
      supabase
        .from('notification_preferences')
        .select('goals_enabled, reminders_enabled, levels_enabled, achievements_enabled, cycles_enabled')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => { if (mounted && data) setPrefs({ ...DEFAULT_PREFS, ...data }); });
    };
    window.addEventListener('notif-prefs-updated', handler);
    return () => { mounted = false; window.removeEventListener('notif-prefs-updated', handler); };
  }, [user?.id]);

  return { prefs, loaded };
}
