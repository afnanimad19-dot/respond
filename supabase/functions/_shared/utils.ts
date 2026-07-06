// Shared helpers for Responde Edge Functions (Deno).
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

export function preflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return null;
}

/** Service-role client — bypasses RLS. Server-side only. */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

/** Client bound to the caller's JWT — RLS applies as that user. */
export function userClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
  });
}

/** Returns the caller's user id + role in the workspace, or null. */
export async function callerRole(
  req: Request,
  workspaceId: string
): Promise<{ userId: string; role: string } | null> {
  const client = userClient(req);
  const { data: userData } = await client.auth.getUser();
  const user = userData?.user;
  if (!user) return null;
  const { data } = await client
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data) return null;
  return { userId: user.id, role: data.role };
}
