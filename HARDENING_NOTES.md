# Safeguard – Hardening & DX Improvements

This commit adds:
- **Security headers** (CSP, X-Frame-Options, Permissions-Policy, etc.) via `next.config.mjs`.
- **Image allowlist** for Supabase storage and common providers.
- **Env validation** with Zod in `lib/env.ts` and wiring in `lib/supabase.ts`.
- **SEO basics**: `app/robots.ts` and `app/sitemap.ts` (requires `NEXT_PUBLIC_SITE_URL`).
- **DX**: ESLint + Prettier configured, with Tailwind plugin and import ordering.
- **Scripts**: `typecheck`, `format`, `lint:fix`.

## After deploying
- Set `NEXT_PUBLIC_SITE_URL` in Vercel Project → Settings → Environment Variables.
- Ensure `NEXT_PUBLIC_SUPABASE_*` variables are set in Vercel (Preview + Production).
- If image loads fail from Supabase, confirm your Supabase project uses `*.supabase.co` domain and public bucket.
