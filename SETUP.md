# PPR Fruits & Vegetables — Setup Guide

## Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) account (free tier is fine)
- A [Vercel](https://vercel.com) account
- A Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))

---

## Step 1: Create Neon Database

1. Go to [neon.tech](https://neon.tech) → New project
2. Name it `ppr-fruits-and-vegetables`
3. Select the region closest to India (e.g. AWS `ap-southeast-1` Singapore)
4. Copy the **Connection string** — it looks like:
   `postgresql://user:password@ep-something.us-east-2.aws.neon.tech/neondb?sslmode=require`

---

## Step 2: Set Up Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL=<your Neon connection string>
ADMIN_JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
CUSTOMER_JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
GEMINI_API_KEY=<your Gemini API key from aistudio.google.com>
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# MSG91 OTP Widget — OTP → Widgets → SecureOTPWidget7RBP → Client Side Integration
NEXT_PUBLIC_MSG91_WIDGET_ID=<your widget ID>
NEXT_PUBLIC_MSG91_TOKEN_AUTH=<your widget token auth>
# MSG91 account Authkey — Settings → Authkey (server-only, never prefix with NEXT_PUBLIC_)
MSG91_AUTH_KEY=<your MSG91 authkey>
```

> ⚠️ **ADMIN_JWT_SECRET and CUSTOMER_JWT_SECRET must both be set** — the app will throw at startup if either is missing. Use different values for each.

---

## Step 3: Run Migrations + Seed

```bash
# Push schema to Neon
npm run db:push

# Seed with initial admin, shop config, and starter vegetables
npm run db:seed
```

> ⚠️ **Initial PIN is `1234`** — change it immediately after first login

---

## Step 4: Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the catalog.  
Open [http://localhost:3000/manage](http://localhost:3000/manage) for admin login.

---

## Step 5: Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect the GitHub repo to Vercel and set environment variables in the Vercel dashboard.

Required env vars in Vercel:

- `DATABASE_URL`
- `ADMIN_JWT_SECRET`
- `CUSTOMER_JWT_SECRET`
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_BASE_URL` → set to your Vercel URL
- `NEXT_PUBLIC_MSG91_WIDGET_ID`
- `NEXT_PUBLIC_MSG91_TOKEN_AUTH`
- `MSG91_AUTH_KEY`

### Post-Deploy Security Checklist

- [ ] `ADMIN_JWT_SECRET` is a random 32+ character hex string (not a dictionary word)
- [ ] `CUSTOMER_JWT_SECRET` is a different random 32+ character hex string
- [ ] Admin PIN has been changed from the default `1234`
- [ ] `MSG91_AUTH_KEY` is set only on Vercel (not in client-side env vars)
- [ ] Neon database is set to require SSL (`sslmode=require` in connection string)

---

## Step 6: Replace Placeholder Assets

These are placeholders that need real images before launch:

| File                                | Replace with                                   |
| ----------------------------------- | ---------------------------------------------- |
| `public/hero.jpg`                   | Real photo of the PPR shop                     |
| `public/icons/icon-192.png`         | Proper 192×192 app icon                        |
| `public/icons/icon-512.png`         | Proper 512×512 app icon                        |
| `public/icons/icon-maskable.png`    | 512×512 maskable variant (with padding)        |
| `public/icons/apple-touch-icon.png` | 180×180 PNG for iOS                            |
| `public/og-image.jpg`               | 1200×630 shop photo for WhatsApp link previews |
| `public/splash/*.png`               | iOS launch screen images (optional but nice)   |

---

## Admin Usage

1. Go to `/manage` (not linked from any public page)
2. Enter phone `8870187248` and PIN `1234` (change immediately)
3. Each morning: toggle in-stock, update prices, add new items inline
4. Hitting "Save (N)" immediately updates the public catalog

---

## Architecture Notes

- **ISR**: Catalog regenerates on any admin write + 30s fallback revalidation
- **Polling**: Open browser tabs check `/api/last-updated` every 25s — auto-refresh if stale
- **Service Worker**: NetworkFirst for pages (3s timeout), CacheFirst for static assets
- **AI blurb**: Runs daily at 6 AM IST via Vercel Cron — no action needed
- **Tamil auto-fill**: Triggered when admin blurs the "English name" field on Add New Item
- **iOS PWA note**: iOS may clear session cookies when the PWA is removed from the home screen or device storage is under pressure. Users will need to re-authenticate via OTP in this case — this is a platform limitation.
