import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Client Supabase côté navigateur (public, anon key).
 * Utilisé pour les opérations côté client (auth, realtime, storage).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Client Supabase côté serveur (service role, accès complet).
 * À utiliser UNIQUEMENT dans les API routes / Server Components.
 * Contourne le Row Level Security.
 */
export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
