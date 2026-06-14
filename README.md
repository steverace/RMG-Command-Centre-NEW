# Race Media Control Centre

Private operating dashboard for Race Media Group. Vite + React + TypeScript + Tailwind v4, Supabase backend, deployed to Cloudflare Pages.

This repo is **Phase 0**: the app shell, design system, routing and Supabase client. Functional features arrive in later phases per the build scope.

## Local development
```bash
npm install
cp .env.example .env.local   # then paste your Supabase URL + anon key
npm run dev
```

## Build settings (Cloudflare Pages)
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 20 (set env var `NODE_VERSION=20` if needed)

## Environment variables (set in Cloudflare Pages > Settings > Environment variables)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Never put the Supabase `service_role` key here — anon key only. The service role key is used only in Edge Functions later (Phase 7).
