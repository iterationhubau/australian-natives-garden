# AU Natives Garden — setup

## Local development (no cloud)

```bash
cd web
npm install
npm run dev
```

Without Supabase env vars the app runs in **local mode** (data on this device only). The 97-species Australian natives library is bundled and gardens start empty.

## Cloud sync (Google sign-in + photos across devices)

1. Create a free [Supabase](https://supabase.com) project.
2. In the SQL editor, run migrations `001`–`003` under [`../supabase/migrations/`](../supabase/migrations/), then optionally [`../supabase/seed/species.sql`](../supabase/seed/species.sql) to load the species library (the app can also upsert from the bundled JSON on first cloud use).
3. Authentication → Providers → enable **Google**.
4. Create a Google Cloud OAuth client (Web) and add:
   - Authorized JavaScript origins: `http://localhost:5173` and your production URL
   - Redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
5. Copy the client ID/secret into Supabase Google provider settings.
6. In the web app:

```bash
cp .env.example .env
```

Fill in:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

7. Restart `npm run dev`. Sign in with Google — garden data and progress photos sync across devices.

### Upload quotas

Personal progress photos are capped at **20 images / 25 MB / 2 MB per file** (enforced in the app and in the SQL trigger). Linked Wikimedia/web URLs do not count.

## Deploy (static hosting)

```bash
cd web
npm run build
```

Deploy the `dist/` folder to Vercel, Netlify, or Cloudflare Pages. Add the same env vars in the host dashboard, and add the production URL to Google OAuth + Supabase redirect allow-lists.

### Vercel

From the `web/` folder:

```bash
npx vercel --prod
```

Or connect the `web/` directory as the project root in the Vercel UI.

### Phone install smoke test

1. Open the deployed (or LAN preview) URL on your phone.
2. iOS Safari: Share → Add to Home Screen.
3. Android Chrome: Menu → Install app / Add to Home Screen.
4. Confirm Library loads, then sign in (cloud) or use local mode to add a plant and create a site.
