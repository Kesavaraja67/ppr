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

# Firebase Phone Auth (for customer OTP login)
# Get this from Firebase Console → Project Settings → General → Web API Key
FIREBASE_WEB_API_KEY=...

# App base URL (used for internal API calls)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project (or use an existing one).
2. Enable **Phone** sign-in under **Authentication → Sign-in method**.
3. Copy the **Web API Key** from **Project Settings → General** and set it as `FIREBASE_WEB_API_KEY`.
4. (Optional) Add test phone numbers under **Authentication → Sign-in method → Phone → Phone numbers for testing** to use without a real SIM during development.
5. In production, Firebase will send SMS via its built-in SMS provider.

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
