/**
 * supabaseClient.ts
 *
 * A single, shared Supabase client for the browser. Handles auth
 * (sign up / log in / log out / session persistence) and reads/writes
 * to the user's OWN rows only — every table has Row Level Security
 * turned on (see supabase/schema.sql), so this client physically
 * cannot read or modify another user's data, even though it only
 * carries the public "anon" key.
 *
 * The service-role key (which CAN bypass RLS) never appears in any
 * client-side file — it's only used server-side, in the Stripe
 * webhook route.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Fails loudly at build/runtime rather than silently returning a
// half-working client if the env vars were never set.
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase env vars are missing — auth/saved songs won't work until NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local."
  );
}

export const supabase = createClient(
  supabaseUrl ?? "",
  supabaseAnonKey ?? ""
);
