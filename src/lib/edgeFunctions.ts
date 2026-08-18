import { supabase } from '@/integrations/supabase/client';

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

/** Full URL of an edge function. */
export function fnUrl(name: string): string {
  return `${FUNCTIONS_BASE}/${name}`;
}

/**
 * Headers for direct `fetch` calls to edge functions.
 * Uses the CURRENT USER SESSION token so the function can identify the user
 * (custom prompts, per-user modules, RLS-scoped reads). Falls back to the
 * publishable key only when there is no session.
 */
export async function fnHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  let token = anon;
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) token = data.session.access_token;
  } catch {
    // keep anon fallback
  }
  return {
    'Content-Type': 'application/json',
    apikey: anon,
    Authorization: `Bearer ${token}`,
    ...(extra || {}),
  };
}
