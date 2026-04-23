

# Enable Demo/Preview Access to Explore the App

## Problem
The app is gated behind Microsoft Entra ID (MSAL) sign-in, but:
1. MSAL `loginRedirect` fails inside the Lovable preview iframe (`redirect_in_iframe` error).
2. No Azure environment variables (`VITE_AZURE_CLIENT_ID`, `VITE_AZURE_TENANT_ID`) are configured, so even popup login wouldn't succeed.
3. There is no backend running in preview, so role lookup and data fetches would fail anyway.

You want to explore the app and its functionality without setting up Azure AD or a live backend.

## Solution: Add a Demo Mode

Introduce a **Demo Mode** that bypasses MSAL and the backend, letting anyone click into the app and see all features with seeded sample data. Real Azure AD auth stays intact for production — demo mode only activates when Azure isn't configured (or via a toggle).

## What Changes

### 1. `src/lib/auth.tsx` — auto-enable demo mode when Azure not configured
- Detect missing `VITE_AZURE_CLIENT_ID` / `VITE_AZURE_TENANT_ID`.
- When missing: skip MSAL entirely, expose `isAuthenticated = true` with a fake demo user ("Demo Admin"), `role = "admin"` so all pages (including Admin/Reports) are explorable.
- `login` / `logout` become no-ops in demo mode.
- Fix the `loginRedirect` iframe crash: when Azure IS configured but we're inside an iframe, fall back to `loginPopup`.

### 2. `src/components/ProtectedRoute.tsx` — fix React ref warning
- Wrap the component with `forwardRef` (or just stop forwarding refs) to clear the console warning seen on `/`.

### 3. `src/lib/api.ts` — demo-mode data layer
- When demo mode is active, short-circuit every `fetch*` / `create*` / `update*` / `delete*` / `upsert*` call to read/write an **in-memory seeded dataset** instead of calling the FastAPI backend.
- Seed with: ~10 sample employees, default codes (Due Diligence, Portfolio Engagement, Centers of Excellence, PTO/Sick), a handful of states/locations, and 2–3 sample weekly submissions so Reports has data to show.
- Mutations update the in-memory store so the user can experience full CRUD during the session (resets on reload).

### 4. Add a small "Demo Mode" badge
- Show a subtle badge in `AppLayout` header (e.g., "Demo Mode — sample data") so it's clear this isn't a real backend.

### 5. Keep production path unchanged
- If both Azure env vars AND `VITE_API_BASE_URL` are present → real MSAL + real API (current behavior).
- Otherwise → demo mode.

## What You'll Be Able to Do After This

- Land on `/` and immediately see the timesheet form populated with sample employees and codes.
- Pick an employee, add rows, save a submission.
- Visit `/admin` to add/edit/delete employees, codes, and locations.
- Visit `/reports`, filter by date, see the Code/State/Cost tabs populated, and download an Excel export.
- All without configuring Azure AD or running the FastAPI backend.

## Files Modified
- `src/lib/auth.tsx` — demo mode detection, iframe-safe login fallback
- `src/components/ProtectedRoute.tsx` — clear forwardRef warning
- `src/lib/api.ts` — in-memory demo data layer with seed
- `src/components/AppLayout.tsx` — demo mode badge

## Notes
- This does NOT remove Microsoft auth. Once you set `VITE_AZURE_CLIENT_ID`, `VITE_AZURE_TENANT_ID`, and `VITE_API_BASE_URL` (and your team runs the backend), the app automatically switches back to real auth + real API.
- Demo data lives only in browser memory — refresh resets it. That's intentional so the demo always starts clean.

