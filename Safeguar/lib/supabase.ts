import { createClient as createSupabaseClient } from "@supabase/supabase-js"

let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log("Supabase URL:", supabaseUrl ? "Set" : "Not Set")
  console.log("Supabase Key:", supabaseKey ? "Set" : "Not Set")
  // For debugging, you can uncomment the following lines to see the actual values (be cautious with sensitive data in logs)
  // console.log("Actual Supabase URL:", supabaseUrl)
  // console.log("Actual Supabase Key (first 5 chars):", supabaseKey ? supabaseKey.substring(0, 5) + '...' : 'Not Set')

  // If environment variables are not set or are invalid, return a mock client for preview mode
  if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith("http")) {
    console.warn("Supabase environment variables are not properly configured or URL is invalid. Using mock client.")
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
  }
  return supabaseInstance
}
