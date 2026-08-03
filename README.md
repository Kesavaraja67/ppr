# PPR Fruits & Vegetables

A Next.js web app for PPR Fruits & Vegetables — a local produce shop in Coimbatore, Tamil Nadu.

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Environment Setup

Copy `.env.local.example` to `.env.local` and fill in the values:

```env
# Neon PostgreSQL database URL
DATABASE_URL=postgresql://...

# JWT secrets (use strong random strings, min 32 chars)
ADMIN_JWT_SECRET=...
CUSTOMER_JWT_SECRET=...

# Google Gemini API (for AI-powered Tamil name suggestions and image generation)
GEMINI_API_KEY=...

# Cron job protection secret
CRON_SECRET=...

# MSG91 OTP Widget — Client Side Integration
# From MSG91 Dashboard → OTP → Widgets → SecureOTPWidget7RBP → Client Side Integration
NEXT_PUBLIC_MSG91_WIDGET_ID=...
NEXT_PUBLIC_MSG91_TOKEN_AUTH=...

# MSG91 account Authkey (server-only — NEVER expose to browser)
# From MSG91 Dashboard → Settings → Authkey
MSG91_AUTH_KEY=...

# App base URL (used for internal API calls)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### MSG91 OTP Widget Setup

OTP verification uses the **MSG91 OTP Widget** (`SecureOTPWidget7RBP`), which handles
SMS delivery via MSG91's own default DLT-approved template — no DLT registration required.

1. **Widget ID & Token Auth** — MSG91 Dashboard → OTP → Widgets → select your widget →
   **Client Side Integration** tab. Copy `widgetId` → `NEXT_PUBLIC_MSG91_WIDGET_ID` and
   `tokenAuth` → `NEXT_PUBLIC_MSG91_TOKEN_AUTH`.
2. **Auth Key** — MSG91 Dashboard → Settings → Authkey. Copy into `MSG91_AUTH_KEY`
   (server-only, never prefix with `NEXT_PUBLIC_`).
3. The widget sends OTP client-side (`window.sendOtp`). After the user enters the code,
   `window.verifyOtp` returns an **access-token** which is sent to
   `POST /api/auth/verify-otp` for server-side confirmation before a session is issued.

## Database

```bash
npm run db:push        # Push schema to database
npm run db:seed        # Seed initial admin + shop config + starter vegetables
npm run db:seed-vegs   # Bulk-add full Tamil Nadu market produce list
npm run db:studio      # Open Drizzle Studio (visual DB browser)
```

## Scripts

```bash
npm run dev            # Start development server
npm run build          # Build for production
npm run lint           # ESLint
npm run type-check     # TypeScript type check
```
