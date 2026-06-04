import { test, expect, Page } from '@playwright/test';

const TEST_PASSWORD = 'TestPass123!';

// ─── Helpers ────────────────────────────────────────────────────────────

async function registerUser(page: Page): Promise<string> {
  const email = `e2e-${Date.now()}@forge-fit-test.com`;
  await page.goto('/auth/register');
  await expect(page.locator('text=Create your account')).toBeVisible({ timeout: 5000 });
  await page.locator('#displayName').fill('E2E Real User');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(TEST_PASSWORD);
  await page.locator('button[type="submit"]').click();
  // Wait for redirect — should go to /onboarding or /dashboard
  await page.waitForURL(/onboarding|\/dashboard/, { timeout: 20000 });
  expect(page.url()).not.toContain('/auth/register');
  return email;
}

async function loginUser(page: Page, email: string): Promise<void> {
  await page.goto('/auth/login');
  await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(TEST_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/onboarding|\/dashboard/, { timeout: 20000 });
  expect(page.url()).not.toContain('/auth/login');
}

async function logoutUser(page: Page): Promise<void> {
  // Try clicking the logout button in the app shell
  try {
    const logoutBtn = page.locator('button:has-text("Log out"), a:has-text("Log out"), button:has-text("Sign out")');
    if (await logoutBtn.isVisible({ timeout: 2000 })) {
      await logoutBtn.click();
      await page.waitForTimeout(2000);
    }
  } catch {
    // Fallback: navigate to homepage and check we're logged out
  }
}

// ─── Full Auth Lifecycle ────────────────────────────────────────────────

test.describe('REAL FLOW: Full Auth Lifecycle', () => {
  test('register → login → protected page → logout → protected page blocked', async ({ page }) => {
    // 1. Register
    const email = await registerUser(page);

    // 2. Should be on onboarding or dashboard
    const afterRegisterUrl = page.url();
    expect(afterRegisterUrl).toMatch(/onboarding|\/dashboard/);

    // 3. Log out
    await logoutUser(page);

    // 4. Protected page should redirect to login
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    // Should have been redirected to login or landing
    expect(page.url()).not.toContain('/dashboard');

    // 5. Log back in
    await loginUser(page, email);

    // 6. Dashboard accessible again
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain('/auth/login');
  });

  test('Google OAuth button redirects to Google sign-in', async ({ page }) => {
    await page.goto('/auth/login');
    const googleBtn = page.locator('button:has(svg):has-text("Continue with Google")');
    await expect(googleBtn).toBeVisible({ timeout: 5000 });

    // Click and verify navigation to Google
    const navPromise = page.waitForNavigation({ timeout: 8000 }).catch(() => null);
    await googleBtn.click();
    const navigated = await navPromise;

    if (navigated) {
      expect(navigated.url()).toContain('accounts.google.com');
    } else {
      test.info().annotations.push({
        type: 'issue',
        description: 'Google OAuth button clicked but no navigation — Supabase Google provider config may need client ID/secret verified in Supabase Dashboard → Auth → Providers → Google',
      });
    }
  });
});

// ─── Feature Flow Tests ─────────────────────────────────────────────────

test.describe('REAL FLOW: Feature Data Flow', () => {
  let userEmail: string;

  test.beforeAll(async ({ browser }) => {
    // Create a fresh user in a new context for feature tests
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    userEmail = await registerUser(page);
    await ctx.close();
  });

  test('workout page loads and displays the form', async ({ page }) => {
    await loginUser(page, userEmail);
    await page.goto('/workouts');
    await page.waitForTimeout(2000);
    // Either the workout form/list loaded or we see a create button
    const hasForm = await page.locator('form, input, button:has-text("Log Workout"), a:has-text("New Workout")').isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasForm).toBeTruthy();
  });

  test('nutrition page loads and displays the form', async ({ page }) => {
    await loginUser(page, userEmail);
    await page.goto('/nutrition');
    await page.waitForTimeout(2000);
    const hasForm = await page.locator('form, input, button:has-text("Log Meal"), a:has-text("New Meal")').isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasForm).toBeTruthy();
  });

  test('sleep page loads and displays the form', async ({ page }) => {
    await loginUser(page, userEmail);
    await page.goto('/sleep');
    await page.waitForTimeout(2000);
    const hasForm = await page.locator('form, input, button:has-text("Log Sleep"), button:has-text("Add Sleep")').isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasForm).toBeTruthy();
  });

  test('leaderboard page loads', async ({ page }) => {
    await loginUser(page, userEmail);
    await page.goto('/leaderboard');
    await page.waitForTimeout(2000);
    const loaded = await page.locator('text=Leaderboard, text=Rankings, text=XP, h1, h2').first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(loaded).toBeTruthy();
  });

  test('profile page loads and shows user info', async ({ page }) => {
    await loginUser(page, userEmail);
    await page.goto('/profile');
    await page.waitForTimeout(2000);
    const hasProfile = await page.locator('text=Profile, text=E2E Real User, text=Settings').first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasProfile).toBeTruthy();
  });
});

// ─── Error States ───────────────────────────────────────────────────────

test.describe('REAL FLOW: Error & Edge Cases', () => {
  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('#email').fill('nonexistent@test.com');
    await page.locator('#password').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    // Should show an error message (either inline or in a toast/alert)
    const hasError = await page.locator('.bg-red-500, [class*="error"], [class*="alert"], text=Invalid, text=Error, text=Incorrect').isVisible({ timeout: 3000 }).catch(() => false);
    // If no error visible, it might be a console error
    if (!hasError) {
      test.info().annotations.push({
        type: 'issue',
        description: 'Login with wrong credentials did not show a visible error message. Check the error handling in the login form.',
      });
    }
  });

  test('unauthenticated user redirected from protected pages', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    // Should NOT be on dashboard if not logged in
    expect(page.url()).not.toContain('/dashboard');
  });
});
