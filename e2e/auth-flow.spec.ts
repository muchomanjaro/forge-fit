import { test, expect } from '@playwright/test';

const TEST_EMAIL = `qa-test-${Date.now()}@forge-fit-test.com`;
const TEST_PASSWORD = 'TestPass123!';
const TEST_DISPLAY_NAME = 'QA Test User';

// ─── Landing Page ────────────────────────────────────────────────

test.describe('Landing Page', () => {
  test('should load with correct title and branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Forge Fit/);

    // Branding elements
    await expect(page.locator('text=Forge Fit').first()).toBeVisible();
    await expect(page.locator('text=Level Up Your').first()).toBeVisible();
    await expect(page.locator('text=Fitness Journey').first()).toBeVisible();

    // No console errors
    const logs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') logs.push(msg.text());
    });
    await page.goto('/');
    await page.waitForTimeout(1000);
    expect(logs.length).toBe(0);
  });

  test('should have sign-up and log-in links', async ({ page }) => {
    await page.goto('/');

    // CTA buttons
    await expect(page.locator('a[href="/auth/register"]').first()).toBeVisible();
    await expect(page.locator('a[href="/auth/login"]').first()).toBeVisible();
  });

  test('should navigate to register page via CTA', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[href="/auth/register"]').first().click();
    await expect(page).toHaveURL(/\/auth\/register/);
    await expect(page.locator('text=Create your account')).toBeVisible();
  });
});

// ─── Registration Page ────────────────────────────────────────────

test.describe('Registration Page', () => {
  test('should load registration form with all fields', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.locator('text=Create your account')).toBeVisible();
    await expect(page.locator('text=Start your fitness journey')).toBeVisible();

    // Form fields
    await expect(page.locator('#displayName')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should display Google OAuth button and attempt sign-in', async ({ page }) => {
    await page.goto('/auth/register');
    const googleBtn = page.locator('button:has(svg):has-text("Continue with Google")');
    await expect(googleBtn).toBeVisible();

    // Click the button — verify it triggers an action
    const [response] = await Promise.allSettled([
      page.waitForNavigation({ timeout: 3000 }),
      googleBtn.click(),
    ]);

    // Check what happened
    if (response.status === 'fulfilled' && response.value) {
      // OAuth redirect occurred — verify destination
      expect(response.value.url()).toMatch(/google|accounts|supabase/);
    } else {
      // No navigation — likely Supabase OAuth not configured
      // Loading state should have appeared and then resolved
      await expect(googleBtn).toBeVisible({ timeout: 3000 });

      test.info().annotations.push({
        type: 'issue',
        description:
          'Google OAuth button clicked but no navigation occurred — Supabase Google provider not configured. Configure at: https://supabase.com/dashboard/project/eahotkajthwiczfxkpnb/auth/providers',
      });
    }
  });

  test('should validate required fields — empty submission', async ({ page }) => {
    await page.goto('/auth/register');
    // HTML5 validation should prevent empty submission; try anyway
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);

    // Since fields are required, HTML5 validation should fire
    const emailInput = page.locator('#email');
    const validationMsg = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMsg.length).toBeGreaterThan(0);
  });

  test('should validate password length — too short', async ({ page }) => {
    await page.goto('/auth/register');
    await page.locator('#displayName').fill(TEST_DISPLAY_NAME);
    await page.locator('#email').fill(TEST_EMAIL);
    await page.locator('#password').fill('ab');
    // Dispatch submit event via Playwright's dispatchEvent to reach React handler
    await page.dispatchEvent('form', 'submit');
    await page.waitForTimeout(1500);

    // Try to find the error message — might be in a div with bg-red-500/10 class
    const errorLocator = page.locator('text=Password must be at least 6 characters');
    await expect(errorLocator).toBeVisible({ timeout: 5000 });
  });

  test('should validate email format — missing domain', async ({ page }) => {
    await page.goto('/auth/register');
    await page.locator('#displayName').fill(TEST_DISPLAY_NAME);
    await page.locator('#email').fill('not-an-email');
    await page.locator('#password').fill(TEST_PASSWORD);
    // Dispatch submit event via Playwright's dispatchEvent to reach React handler
    await page.dispatchEvent('form', 'submit');
    await page.waitForTimeout(1500);

    await expect(page.locator('text=Please enter a valid email address')).toBeVisible({ timeout: 5000 });
  });

  test('should attempt registration with valid data (expected to fail without configured Supabase)', async ({ page }) => {
    // Collect console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/auth/register');
    await page.locator('#displayName').fill(TEST_DISPLAY_NAME);
    await page.locator('#email').fill(TEST_EMAIL);
    await page.locator('#password').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();

    // Wait for response
    await page.waitForTimeout(3000);

    // Check what happened — either we got an error displayed or we stayed on page
    const currentUrl = page.url();

    if (currentUrl.includes('/onboarding')) {
      console.log('Registration succeeded (onboarding page reached)');
    } else if (currentUrl.includes('/auth/register')) {
      // We stayed on register — likely an error was displayed or supabase not configured
      // This is expected per the task description
      const errorText = await page.locator('.bg-red-500\\/10').textContent().catch(() => null);
      console.log(`Registration failed with error: ${errorText || 'no error shown'}`);
      test.info().annotations.push({
        type: 'issue',
        description: `Registration silently fails: ${errorText || 'no visible error, check console'}`,
      });
    }

    // Log console errors for diagnosis
    if (consoleErrors.length > 0) {
      console.log('Console errors during registration:', JSON.stringify(consoleErrors));
    }
  });

  test('should have link to login page', async ({ page }) => {
    await page.goto('/auth/register');
    const loginLink = page.locator('a[href="/auth/login"]');
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveText(/log in/i);
  });
});

// ─── Login Page ──────────────────────────────────────────────────

test.describe('Login Page', () => {
  test('should load login form', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('text=Welcome back')).toBeVisible();
    await expect(page.locator('text=Log in to your account')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('should display Google OAuth button on login and attempt sign-in', async ({ page }) => {
    await page.goto('/auth/login');
    const googleBtn = page.locator('button:has(svg):has-text("Continue with Google")');
    await expect(googleBtn).toBeVisible();

    // Click the button — verify it triggers an action
    const [response] = await Promise.allSettled([
      page.waitForNavigation({ timeout: 3000 }),
      googleBtn.click(),
    ]);

    if (response.status === 'fulfilled' && response.value) {
      expect(response.value.url()).toMatch(/google|accounts|supabase/);
    } else {
      test.info().annotations.push({
        type: 'issue',
        description:
          'Google OAuth button on login clicked but no navigation occurred — Supabase Google provider not configured. Configure at: https://supabase.com/dashboard/project/eahotkajthwiczfxkpnb/auth/providers',
      });
    }
  });

  test('should have link to sign up page', async ({ page }) => {
    await page.goto('/auth/login');
    const signupLink = page.locator('a[href="/auth/register"]');
    await expect(signupLink).toBeVisible();
    await expect(signupLink).toHaveText(/sign up/i);
  });

  test('should attempt login with test data', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/auth/login');
    await page.locator('#email').fill(TEST_EMAIL);
    await page.locator('#password').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await page.waitForTimeout(3000);

    // Should show error since user doesn't exist in supabase
    const errorEl = page.locator('.bg-red-500\\/10');
    if (await errorEl.isVisible().catch(() => false)) {
      const errorText = await errorEl.textContent();
      console.log(`Login error displayed: ${errorText}`);
    }

    if (consoleErrors.length > 0) {
      console.log('Console errors during login:', JSON.stringify(consoleErrors));
    }
  });
});

// ─── Auth Callback Page ──────────────────────────────────────────

test.describe('Auth Callback', () => {
  test('should load callback page', async ({ page }) => {
    await page.goto('/auth/callback');
    await expect(page.locator('text=Completing sign-in...')).toBeVisible();
  });
});

// ─── Navigation Flow ─────────────────────────────────────────────

test.describe('Auth Navigation Flow', () => {
  test('should navigate landing → register → login → back', async ({ page }) => {
    await page.goto('/');
    // Landing → Register
    await page.locator('a[href="/auth/register"]').first().click();
    await expect(page).toHaveURL(/\/auth\/register/);

    // Register → Login
    await page.locator('a[href="/auth/login"]').click();
    await expect(page).toHaveURL(/\/auth\/login/);

    // Login → Register
    await page.locator('a[href="/auth/register"]').click();
    await expect(page).toHaveURL(/\/auth\/register/);
  });
});
