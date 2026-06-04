# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: real-user-flow.spec.ts >> REAL FLOW: Full Auth Lifecycle >> register → login → protected page → logout → protected page blocked
- Location: e2e/real-user-flow.spec.ts:47:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - link "Forge Fit" [ref=e4] [cursor=pointer]:
      - /url: /
      - img [ref=e6]
      - generic [ref=e8]: Forge Fit
    - generic [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e11]: Create your account
        - generic [ref=e12]: Start your fitness journey
      - button "Continue with Google" [ref=e14]:
        - img [ref=e15]
        - text: Continue with Google
      - generic [ref=e24]: Or continue with email
      - generic [ref=e25]:
        - generic [ref=e26]:
          - generic [ref=e27]: email rate limit exceeded
          - generic [ref=e28]:
            - text: Display Name
            - textbox "Display Name" [ref=e29]:
              - /placeholder: Your name
              - text: E2E Real User
          - generic [ref=e30]:
            - text: Email
            - textbox "Email" [ref=e31]:
              - /placeholder: you@example.com
              - text: e2e-1780495489298@forge-fit-test.com
          - generic [ref=e32]:
            - text: Password
            - textbox "Password" [ref=e33]:
              - /placeholder: At least 6 characters
              - text: TestPass123!
        - generic [ref=e34]:
          - button "Create account" [ref=e35]
          - paragraph [ref=e36]:
            - text: Already have an account?
            - link "Log in" [ref=e37] [cursor=pointer]:
              - /url: /auth/login
  - button "Open Next.js Dev Tools" [ref=e43] [cursor=pointer]:
    - img [ref=e44]
  - alert [ref=e47]
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | 
  3   | const TEST_PASSWORD = 'TestPass123!';
  4   | 
  5   | // ─── Helpers ────────────────────────────────────────────────────────────
  6   | 
  7   | async function registerUser(page: Page): Promise<string> {
  8   |   const email = `e2e-${Date.now()}@forge-fit-test.com`;
  9   |   await page.goto('/auth/register');
  10  |   await expect(page.locator('text=Create your account')).toBeVisible({ timeout: 5000 });
  11  |   await page.locator('#displayName').fill('E2E Real User');
  12  |   await page.locator('#email').fill(email);
  13  |   await page.locator('#password').fill(TEST_PASSWORD);
  14  |   await page.locator('button[type="submit"]').click();
  15  |   // Wait for redirect — should go to /onboarding or /dashboard
> 16  |   await page.waitForURL(/onboarding|\/dashboard/, { timeout: 20000 });
      |              ^ TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
  17  |   expect(page.url()).not.toContain('/auth/register');
  18  |   return email;
  19  | }
  20  | 
  21  | async function loginUser(page: Page, email: string): Promise<void> {
  22  |   await page.goto('/auth/login');
  23  |   await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
  24  |   await page.locator('#email').fill(email);
  25  |   await page.locator('#password').fill(TEST_PASSWORD);
  26  |   await page.locator('button[type="submit"]').click();
  27  |   await page.waitForURL(/onboarding|\/dashboard/, { timeout: 20000 });
  28  |   expect(page.url()).not.toContain('/auth/login');
  29  | }
  30  | 
  31  | async function logoutUser(page: Page): Promise<void> {
  32  |   // Try clicking the logout button in the app shell
  33  |   try {
  34  |     const logoutBtn = page.locator('button:has-text("Log out"), a:has-text("Log out"), button:has-text("Sign out")');
  35  |     if (await logoutBtn.isVisible({ timeout: 2000 })) {
  36  |       await logoutBtn.click();
  37  |       await page.waitForTimeout(2000);
  38  |     }
  39  |   } catch {
  40  |     // Fallback: navigate to homepage and check we're logged out
  41  |   }
  42  | }
  43  | 
  44  | // ─── Full Auth Lifecycle ────────────────────────────────────────────────
  45  | 
  46  | test.describe('REAL FLOW: Full Auth Lifecycle', () => {
  47  |   test('register → login → protected page → logout → protected page blocked', async ({ page }) => {
  48  |     // 1. Register
  49  |     const email = await registerUser(page);
  50  | 
  51  |     // 2. Should be on onboarding or dashboard
  52  |     const afterRegisterUrl = page.url();
  53  |     expect(afterRegisterUrl).toMatch(/onboarding|\/dashboard/);
  54  | 
  55  |     // 3. Log out
  56  |     await logoutUser(page);
  57  | 
  58  |     // 4. Protected page should redirect to login
  59  |     await page.goto('/dashboard');
  60  |     await page.waitForTimeout(2000);
  61  |     // Should have been redirected to login or landing
  62  |     expect(page.url()).not.toContain('/dashboard');
  63  | 
  64  |     // 5. Log back in
  65  |     await loginUser(page, email);
  66  | 
  67  |     // 6. Dashboard accessible again
  68  |     await page.goto('/dashboard');
  69  |     await page.waitForTimeout(2000);
  70  |     expect(page.url()).not.toContain('/auth/login');
  71  |   });
  72  | 
  73  |   test('Google OAuth button redirects to Google sign-in', async ({ page }) => {
  74  |     await page.goto('/auth/login');
  75  |     const googleBtn = page.locator('button:has(svg):has-text("Continue with Google")');
  76  |     await expect(googleBtn).toBeVisible({ timeout: 5000 });
  77  | 
  78  |     // Click and verify navigation to Google
  79  |     const navPromise = page.waitForNavigation({ timeout: 8000 }).catch(() => null);
  80  |     await googleBtn.click();
  81  |     const navigated = await navPromise;
  82  | 
  83  |     if (navigated) {
  84  |       expect(navigated.url()).toContain('accounts.google.com');
  85  |     } else {
  86  |       test.info().annotations.push({
  87  |         type: 'issue',
  88  |         description: 'Google OAuth button clicked but no navigation — Supabase Google provider config may need client ID/secret verified in Supabase Dashboard → Auth → Providers → Google',
  89  |       });
  90  |     }
  91  |   });
  92  | });
  93  | 
  94  | // ─── Feature Flow Tests ─────────────────────────────────────────────────
  95  | 
  96  | test.describe('REAL FLOW: Feature Data Flow', () => {
  97  |   let userEmail: string;
  98  | 
  99  |   test.beforeAll(async ({ browser }) => {
  100 |     // Create a fresh user in a new context for feature tests
  101 |     const ctx = await browser.newContext();
  102 |     const page = await ctx.newPage();
  103 |     userEmail = await registerUser(page);
  104 |     await ctx.close();
  105 |   });
  106 | 
  107 |   test('workout page loads and displays the form', async ({ page }) => {
  108 |     await loginUser(page, userEmail);
  109 |     await page.goto('/workouts');
  110 |     await page.waitForTimeout(2000);
  111 |     // Either the workout form/list loaded or we see a create button
  112 |     const hasForm = await page.locator('form, input, button:has-text("Log Workout"), a:has-text("New Workout")').isVisible({ timeout: 3000 }).catch(() => false);
  113 |     expect(hasForm).toBeTruthy();
  114 |   });
  115 | 
  116 |   test('nutrition page loads and displays the form', async ({ page }) => {
```