# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-flow.spec.ts >> Registration Page >> should load registration form with all fields
- Location: e2e/auth-flow.spec.ts:48:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:8080/auth/register", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const TEST_EMAIL = `qa-test-${Date.now()}@forge-fit-test.com`;
  4   | const TEST_PASSWORD = 'TestPass123!';
  5   | const TEST_DISPLAY_NAME = 'QA Test User';
  6   | 
  7   | // ─── Landing Page ────────────────────────────────────────────────
  8   | 
  9   | test.describe('Landing Page', () => {
  10  |   test('should load with correct title and branding', async ({ page }) => {
  11  |     await page.goto('/');
  12  |     await expect(page).toHaveTitle(/Forge Fit/);
  13  | 
  14  |     // Branding elements
  15  |     await expect(page.locator('text=Forge Fit').first()).toBeVisible();
  16  |     await expect(page.locator('text=Level Up Your').first()).toBeVisible();
  17  |     await expect(page.locator('text=Fitness Journey').first()).toBeVisible();
  18  | 
  19  |     // No console errors
  20  |     const logs: string[] = [];
  21  |     page.on('console', (msg) => {
  22  |       if (msg.type() === 'error') logs.push(msg.text());
  23  |     });
  24  |     await page.goto('/');
  25  |     await page.waitForTimeout(1000);
  26  |     expect(logs.length).toBe(0);
  27  |   });
  28  | 
  29  |   test('should have sign-up and log-in links', async ({ page }) => {
  30  |     await page.goto('/');
  31  | 
  32  |     // CTA buttons
  33  |     await expect(page.locator('a[href="/auth/register"]').first()).toBeVisible();
  34  |     await expect(page.locator('a[href="/auth/login"]').first()).toBeVisible();
  35  |   });
  36  | 
  37  |   test('should navigate to register page via CTA', async ({ page }) => {
  38  |     await page.goto('/');
  39  |     await page.locator('a[href="/auth/register"]').first().click();
  40  |     await expect(page).toHaveURL(/\/auth\/register/);
  41  |     await expect(page.locator('text=Create your account')).toBeVisible();
  42  |   });
  43  | });
  44  | 
  45  | // ─── Registration Page ────────────────────────────────────────────
  46  | 
  47  | test.describe('Registration Page', () => {
  48  |   test('should load registration form with all fields', async ({ page }) => {
> 49  |     await page.goto('/auth/register');
      |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  50  |     await expect(page.locator('text=Create your account')).toBeVisible();
  51  |     await expect(page.locator('text=Start your fitness journey')).toBeVisible();
  52  | 
  53  |     // Form fields
  54  |     await expect(page.locator('#displayName')).toBeVisible();
  55  |     await expect(page.locator('#email')).toBeVisible();
  56  |     await expect(page.locator('#password')).toBeVisible();
  57  |     await expect(page.locator('button[type="submit"]')).toBeVisible();
  58  |   });
  59  | 
  60  |   test('should display Google OAuth button', async ({ page }) => {
  61  |     await page.goto('/auth/register');
  62  |     const googleBtn = page.locator('button:has(svg):has-text("Continue with Google")');
  63  |     await expect(googleBtn).toBeVisible();
  64  |   });
  65  | 
  66  |   test('should validate required fields — empty submission', async ({ page }) => {
  67  |     await page.goto('/auth/register');
  68  |     // HTML5 validation should prevent empty submission; try anyway
  69  |     await page.locator('button[type="submit"]').click();
  70  |     await page.waitForTimeout(500);
  71  | 
  72  |     // Since fields are required, HTML5 validation should fire
  73  |     const emailInput = page.locator('#email');
  74  |     const validationMsg = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
  75  |     expect(validationMsg.length).toBeGreaterThan(0);
  76  |   });
  77  | 
  78  |   test('should validate password length — too short', async ({ page }) => {
  79  |     await page.goto('/auth/register');
  80  |     await page.locator('#displayName').fill(TEST_DISPLAY_NAME);
  81  |     await page.locator('#email').fill(TEST_EMAIL);
  82  |     await page.locator('#password').fill('ab');
  83  |     // Dispatch submit event via Playwright's dispatchEvent to reach React handler
  84  |     await page.dispatchEvent('form', 'submit');
  85  |     await page.waitForTimeout(1500);
  86  | 
  87  |     // Try to find the error message — might be in a div with bg-red-500/10 class
  88  |     const errorLocator = page.locator('text=Password must be at least 6 characters');
  89  |     await expect(errorLocator).toBeVisible({ timeout: 5000 });
  90  |   });
  91  | 
  92  |   test('should validate email format — missing domain', async ({ page }) => {
  93  |     await page.goto('/auth/register');
  94  |     await page.locator('#displayName').fill(TEST_DISPLAY_NAME);
  95  |     await page.locator('#email').fill('not-an-email');
  96  |     await page.locator('#password').fill(TEST_PASSWORD);
  97  |     // Dispatch submit event via Playwright's dispatchEvent to reach React handler
  98  |     await page.dispatchEvent('form', 'submit');
  99  |     await page.waitForTimeout(1500);
  100 | 
  101 |     await expect(page.locator('text=Please enter a valid email address')).toBeVisible({ timeout: 5000 });
  102 |   });
  103 | 
  104 |   test('should attempt registration with valid data (expected to fail without configured Supabase)', async ({ page }) => {
  105 |     // Collect console errors
  106 |     const consoleErrors: string[] = [];
  107 |     page.on('console', (msg) => {
  108 |       if (msg.type() === 'error') consoleErrors.push(msg.text());
  109 |     });
  110 | 
  111 |     await page.goto('/auth/register');
  112 |     await page.locator('#displayName').fill(TEST_DISPLAY_NAME);
  113 |     await page.locator('#email').fill(TEST_EMAIL);
  114 |     await page.locator('#password').fill(TEST_PASSWORD);
  115 |     await page.locator('button[type="submit"]').click();
  116 | 
  117 |     // Wait for response
  118 |     await page.waitForTimeout(3000);
  119 | 
  120 |     // Check what happened — either we got an error displayed or we stayed on page
  121 |     const currentUrl = page.url();
  122 | 
  123 |     if (currentUrl.includes('/onboarding')) {
  124 |       console.log('Registration succeeded (onboarding page reached)');
  125 |     } else if (currentUrl.includes('/auth/register')) {
  126 |       // We stayed on register — likely an error was displayed or supabase not configured
  127 |       // This is expected per the task description
  128 |       const errorText = await page.locator('.bg-red-500\\/10').textContent().catch(() => null);
  129 |       console.log(`Registration failed with error: ${errorText || 'no error shown'}`);
  130 |       test.info().annotations.push({
  131 |         type: 'issue',
  132 |         description: `Registration silently fails: ${errorText || 'no visible error, check console'}`,
  133 |       });
  134 |     }
  135 | 
  136 |     // Log console errors for diagnosis
  137 |     if (consoleErrors.length > 0) {
  138 |       console.log('Console errors during registration:', JSON.stringify(consoleErrors));
  139 |     }
  140 |   });
  141 | 
  142 |   test('should have link to login page', async ({ page }) => {
  143 |     await page.goto('/auth/register');
  144 |     const loginLink = page.locator('a[href="/auth/login"]');
  145 |     await expect(loginLink).toBeVisible();
  146 |     await expect(loginLink).toHaveText(/log in/i);
  147 |   });
  148 | });
  149 | 
```