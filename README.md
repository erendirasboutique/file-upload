# Erendira File Share

A small standalone app for sharing files (PDFs, images, anything) on your own domain.
Staff upload behind an access code; anyone with the link gets a branded viewer page.

Stack: Next.js 14 (App Router) · Vercel · Cloudflare R2 (free tier: 10GB storage, zero egress fees)

## How it works

1. Staff signs in at `/login` with the access code (HMAC-signed cookie, 30 days)
2. Drag a file onto `/` — the app requests a presigned URL, then the browser uploads
   **directly to R2** (never through Vercel, so no serverless size/time limits)
3. Files get short keys like `aB3xK9pQ/summer-lookbook.pdf`
4. Anyone can open `yourdomain.com/f/aB3xK9pQ/summer-lookbook.pdf` — a branded page
   with the PDF embedded (or image displayed) and a download button

## Setup

### 1. Cloudflare R2 (one time)
- Create bucket (e.g. `erendira-files`)
- Enable public access: connect a custom domain (Settings → Public access → Custom Domains)
  or enable the `r2.dev` subdomain
- Create an API token: R2 overview → Manage API Tokens → Create → Object Read & Write,
  scoped to your bucket. Save the Access Key ID, Secret Access Key, and Account ID.
- Add a CORS policy on the bucket (Settings → CORS Policy):

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://YOUR-APP.vercel.app"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### 2. Local dev
```bash
npm install
cp .env.example .env.local   # fill in your values
npm run dev
```

### 3. Fonts (optional)
Copy your brand font files into `public/fonts/`:
- `LaLuxesSerif.woff2`
- `Recoleta-Regular.woff2`
- `Recoleta-Medium.woff2`

If missing, the app falls back to Georgia — everything still works.

### 4. Deploy to Vercel
1. Push this folder to a new GitHub repo
2. Import it in Vercel → New Project
3. Add all the env vars from `.env.example` in Project Settings → Environment Variables
4. Deploy
5. Go back to the R2 CORS policy and add your production URL to `AllowedOrigins`
6. (Optional) Add a custom domain in Vercel, e.g. `files.erendirasboutique.com`,
   and add that to the CORS policy too

## Env vars

| Variable | What it is |
|---|---|
| `R2_ACCOUNT_ID` | Hex string from your R2 endpoint / dashboard |
| `R2_ACCESS_KEY_ID` | From the API token |
| `R2_SECRET_ACCESS_KEY` | From the API token (shown once) |
| `R2_BUCKET` | Bucket name, e.g. `erendira-files` |
| `R2_PUBLIC_BASE_URL` | `https://cdn.erendirasboutique.com` or `https://pub-xxxx.r2.dev` (no trailing slash) |
| `UPLOAD_ACCESS_CODE` | The code staff types to sign in |
| `AUTH_SECRET` | Long random string for signing cookies (`openssl rand -base64 32`) |

## Notes

- Max upload size is 100 MB (set in `app/api/upload-url/route.ts`) — raise or lower as you like
- The `/f/...` viewer pages are public by design; the upload page and file listing are staff-only
- To delete a file, remove it in the Cloudflare R2 dashboard (or ask Claude to add a delete button later)
