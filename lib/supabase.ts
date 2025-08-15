import { createClient as createSupabaseClient } from "@supabase/supabase-js"

let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null

export function createClient() {
  import { env } from "./env";
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log("[Supabase Client Init] Supabase URL (from env):", supabaseUrl ? "Set" : "NOT SET")
  console.log("[Supabase Client Init] Supabase Key (from env):", supabaseKey ? "Set" : "NOT SET")

  // Check if environment variables are properly configured
  if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith("http")) {
    console.error("--- Supabase Configuration Error ---")
    console.error("Supabase environment variables are NOT properly configured or URL is invalid.")
    console.error("Please ensure the following are set in your Vercel Project Environment Variables:")
    console.error("  1. NEXT_PUBLIC_SUPABASE_URL (e.g., https://your-project-ref.supabase.co)")
    console.error("  2. NEXT_PUBLIC_SUPABASE_ANON_KEY (your public anon key)")
    console.error("Current NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl)
    console.error(
      "Current NEXT_PUBLIC_SUPABASE_ANON_KEY (first 5 chars):",
      supabaseKey ? supabaseKey.substring(0, 5) + "..." : "Not Set",
    )
    console.error("------------------------------------")

    // Return a mock client for preview mode or misconfiguration
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signUp: () => Promise.resolve({ data: { user: null }, error: { message: "Demo mode - use mock login" } }),
        signInWithPassword: () =>
          Promise.resolve({ data: { user: null }, error: { message: "Demo mode - use mock login" } }),
        signOut: () => Promise.resolve({ error: null }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }),
        insert: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }),
      storage: {
        from: () => ({
          upload: () => Promise.resolve({ data: null }),
          getPublicUrl: () => ({ data: { publicUrl: "/placeholder.svg" } }),
        }),
      },
    } as any
  }

  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
    console.log("[Supabase Client Init] Supabase client initialized successfully.")
  }
  return supabaseInstance
}
