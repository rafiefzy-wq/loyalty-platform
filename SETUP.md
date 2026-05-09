# StampPass — Setup Guide

## Prerequisites
- Node.js 20+
- Supabase project (free tier works)
- Vercel account (for deployment)
- Apple Developer account (for Apple Wallet passes)
- Google Cloud account with Wallet API enabled (for Google Wallet)
- Resend account (for transactional emails)

## 1. Clone and install

```bash
cd loyalty-platform
npm install
```

## 2. Required: Delete proxy.ts from project root

> **Important:** A `proxy.ts` file was created accidentally during scaffolding. Delete it before running `next build`:

```bash
# Windows
del proxy.ts

# Mac/Linux
rm proxy.ts
```

## 3. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in the values:

```bash
cp .env.local.example .env.local
```

### Supabase setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
5. Run migrations:

```bash
# In Supabase SQL Editor, run in order:
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
```

### Supabase Storage
Create a storage bucket named `business-assets` with public access enabled.

### Apple Wallet setup
1. Log in to [Apple Developer Portal](https://developer.apple.com)
2. Create a **Pass Type ID** (e.g., `pass.com.yourcompany.loyalty`)
3. Create a certificate for that Pass Type ID and download the `.p12` file
4. Download the **WWDR G4 certificate** from Apple PKI page
5. Create an **APNs key** for push notifications
6. Convert certificates to base64:

```bash
base64 -i PassCertificate.p12 | pbcopy  # macOS
```

7. Set all `APPLE_*` env vars accordingly

### Google Wallet setup
1. Enable the **Google Wallet API** in Google Cloud Console
2. Create a **service account** with Wallet API editor role
3. Download the service account JSON key
4. Get your **Issuer ID** from the Google Pay & Wallet Console
5. Convert JSON to base64:

```bash
base64 -i service-account.json | pbcopy  # macOS
```

## 4. Run locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## 5. Deploy to Vercel

```bash
npx vercel
```

Set all `.env.local` variables as Vercel Environment Variables.

## Architecture overview

```
/ ─────────────────── Marketing homepage
/register ─────────── Business owner signup
/login ────────────── Business owner login
/onboarding ────────── 4-step setup wizard
/dashboard ─────────── Owner portal
  /dashboard/customers  Customer list + reward queue
  /dashboard/analytics  Charts and stats
  /dashboard/design     Card design editor (live preview)
  /dashboard/team       Employee invitations
  /dashboard/broadcast  Push notification composer
  /dashboard/settings   Business + location management
/scanner ──────────── Employee stamp scanner (mobile)
/pass/[uuid] ──────── Customer wallet card landing page
  /pass/new?card=<id>  Generates a new pass for a loyalty card
/invite/accept ─────── Accept team invitation

API routes:
/api/passes/create     Creates a new CustomerPass record
/api/passes/apple/[id] Downloads .pkpass file
/api/passes/qr         Generates QR code PNG
/api/stamps            Adds a stamp (employee auth required)
/api/stamps/redeem     Confirms reward redemption (manager+)
/api/broadcast         Sends push notification to all pass holders
/api/employees/invite  Creates employee invitation + sends email
/api/employees/accept  Accepts an employee invitation
/api/businesses/design Updates card design
/api/businesses/update Updates business profile
/api/businesses/locations CRUD for locations
```

## Security model

- **RLS enforced** on all Supabase tables — businesses see only their own data
- **Stamp can only be added by authenticated employees** scanning a pass — never by customers
- **All stamp transactions are logged** in `stamp_transactions` for audit trail
- **Pass QR codes are UUID-based** and not guessable
- **Employee roles** (owner, manager, staff) control who can redeem rewards
