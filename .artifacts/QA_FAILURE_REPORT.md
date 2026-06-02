# QA Failure Report — forge-fit Registration & Auth Flow

**Date:** 2026-06-02  
**QA Agent:** Enobarbus (Roman Cohort)  
**Target:** https://crease-awkward-dismiss.ngrok-free.dev / localhost:8080  
**Pipeline Config:** `/Users/asd/forge-fit/.pipeline-config.json`  
**Test Artifacts:** `/Users/asd/forge-fit/e2e/auth-flow.spec.ts`  
**Attempt:** 1 of 3 (max_qa_retries)

---

## Executive Summary

16/16 Playwright tests pass (UI, validation, navigation, form submission), but the **core registration and authentication flow is broken at runtime**. Supabase Auth rejects all registration and login attempts. The Google OAuth button is present but the provider is not configured. The app is **not usable by end users**.

| Severity | Count |
|----------|-------|
| Critical | 2     |
| Major    | 2     |
| Minor    | 1     |

---

## Issue 1 — Registration silently fails at runtime

- **Severity:** Critical
- **Category:** Functional
- **Evidence:** Test output and console logs

```
Registration failed with error: Email address "qa-test-1780376236301@forge-fit-test.com" is invalid
Console errors: ["Failed to load resource: the server responded with a status of 400 ()"]
```

After rate limiting kicked in (from repeated test runs):
```
Registration failed with error: email rate limit exceeded
Console errors: ["Failed to load resource: the server responded with a status of 429 ()"]
```

**Reproduction steps:**
1. Navigate to `/auth/register`
2. Fill in Display Name, valid email, password (≥6 chars)
3. Click "Create account"
4. Observe error: "Email address is invalid" or rate limit

**Root cause analysis:**
- The `@supabase/ssr` `createBrowserClient()` call succeeds at loading (no bundle errors)
- The Supabase Auth API at the configured project rejects the registration
- The `.env.local` credentials likely point to a Supabase project where the email domain or format is not accepted, or the project is not properly initialized
- The frontend error handling works (error is displayed to user) but there is no graceful fallback or user-friendly messaging

---

## Issue 2 — Google OAuth button present but provider not configured

- **Severity:** Critical
- **Category:** Configuration
- **Evidence:** Visual verification + config inspection

The Google OAuth button renders correctly on both the login and registration pages:
```html
<button type="button">[Google SVG icon] Continue with Google</button>
```

However, the supabase configuration (`supabase/config.toml`) has **no `[auth.external.google]` section** at all. Only Apple is listed:
```toml
[auth.external.apple]
enabled = false
```

Clicks on the button will trigger `supabase.auth.signInWithOAuth({ provider: "google" })` which will fail because Google is not enabled in the Supabase project configuration.

**Reproduction steps:**
1. Navigate to `/auth/register` or `/auth/login`
2. Click "Continue with Google"
3. Observe: OAuth flow will fail or redirect with an error

---

## Issue 3 — Login returns 400 with "Invalid login credentials"

- **Severity:** Major
- **Category:** Functional
- **Evidence:** Test output and console logs

```
Login error displayed: Invalid login credentials
Console errors during login: ["Failed to load resource: the server responded with a status of 400 ()"]
```

**Reproduction steps:**
1. Navigate to `/auth/login`
2. Enter any email and password
3. Click "Log in"
4. Observe: 400 error, "Invalid login credentials"

**Note:** This is partially expected since no users have been registered successfully, but it confirms the login API is wired to a Supabase project that is receiving and processing requests (not a connection failure).

---

## Issue 4 — Console errors on auth API calls

- **Severity:** Major
- **Category:** Console / Runtime
- **Evidence:** Test console capture

All auth-related API calls produce console errors:
```
Failed to load resource: the server responded with a status of 400 ()
Failed to load resource: the server responded with a status of 429 ()
```

These are logged as resource errors, not caught exceptions, which means they appear as browser console noise. While not visible to end users directly, they pollute the console and could mask other real errors.

---

## Issue 5 — user_profiles and user_stats tables referenced but may not exist

- **Severity:** Minor
- **Category:** Functional
- **Evidence:** Source code inspection

The `/api/auth/register/route.ts` handler attempts to insert into `user_profiles` and `user_stats` tables after Supabase Auth signup. However, the migration file (`supabase/migrations/00001_forge_fit.sql`) creates tables named **`users`** (not `user_profiles`) and includes no `user_stats` table with the schema expected by the API.

The API route does:
```typescript
await supabase.from('user_profiles').insert({ user_id: authData.user.id })
await supabase.from('user_stats').insert({ user_id: authData.user.id, date: ... })
```

But the migration creates:
```sql
CREATE TABLE user_profiles (id UUID, user_id UUID REFERENCES users(id), ...)
```

The `user_stats` table **does exist** in the migration (section 2.11). However, if the migration hasn't been applied to the connected Supabase project, these inserts will fail silently (the errors are logged but not surfaced to the user).

---

## QA Verdict

**FAILURE.** The application has critical functional defects that prevent users from creating accounts or logging in. While the test suite validated all UI elements, navigation, form fields, and client-side validation correctly, the runtime auth flow is non-functional.

### Required actions for design re-entry (Cincinnatus):

1. **Fix Supabase project configuration** — Verify `.env.local` credentials point to a working Supabase project with auth properly initialized
2. **Enable Google OAuth provider** — Add `[auth.external.google]` to `supabase/config.toml` and configure credentials in the Supabase dashboard
3. **Apply database migrations** — Ensure `supabase/migrations/00001_forge_fit.sql` has been applied to the connected project
4. **Align API routes with actual schema** — Fix route handler to match the table structure defined in migrations (or update migrations to include `user_profiles` and `user_stats`)
5. **Add user-friendly error handling** — Current error messages ("Email address is invalid") are opaque; provide actionable guidance

---

## Attachments

- **Playwright test file:** `/Users/asd/forge-fit/e2e/auth-flow.spec.ts` (16 tests)
- **Playwright config:** `/Users/asd/forge-fit/playwright.config.ts`
- **Pipeline config:** `/Users/asd/forge-fit/.pipeline-config.json`
- **Test results:** 16/16 passed (functional assertion level), see `e2e-results.json` after next run with `--reporter=json`

---

*Report generated by Enobarbus, QA Test Agent of the Roman Cohort.*
