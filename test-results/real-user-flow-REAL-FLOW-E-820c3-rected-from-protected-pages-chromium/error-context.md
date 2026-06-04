# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: real-user-flow.spec.ts >> REAL FLOW: Error & Edge Cases >> unauthenticated user redirected from protected pages
- Location: e2e/real-user-flow.spec.ts:169:7

# Error details

```
Error: expect(received).not.toContain(expected) // indexOf

Expected substring: not "/dashboard"
Received string:        "http://localhost:8080/dashboard"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]:
        - link "Forge Fit" [ref=e6] [cursor=pointer]:
          - /url: /dashboard
          - img [ref=e8]
          - generic [ref=e10]: Forge Fit
        - navigation [ref=e11]:
          - link "Dashboard" [ref=e12] [cursor=pointer]:
            - /url: /dashboard
            - img [ref=e13]
            - text: Dashboard
          - link "Workouts" [ref=e18] [cursor=pointer]:
            - /url: /workouts
            - img [ref=e19]
            - text: Workouts
          - link "Nutrition" [ref=e25] [cursor=pointer]:
            - /url: /nutrition
            - img [ref=e26]
            - text: Nutrition
          - link "Sleep" [ref=e29] [cursor=pointer]:
            - /url: /sleep
            - img [ref=e30]
            - text: Sleep
          - link "Progress" [ref=e32] [cursor=pointer]:
            - /url: /progress
            - img [ref=e33]
            - text: Progress
          - link "Achievements" [ref=e36] [cursor=pointer]:
            - /url: /achievements
            - img [ref=e37]
            - text: Achievements
          - link "Settings" [ref=e43] [cursor=pointer]:
            - /url: /settings
            - img [ref=e44]
            - text: Settings
        - generic [ref=e48]:
          - paragraph [ref=e49]: Forge your best self
          - paragraph [ref=e50]: Every workout counts
    - generic [ref=e51]:
      - banner [ref=e52]:
        - button "Search pages... ⌘K" [ref=e54]:
          - img [ref=e55]
          - generic [ref=e58]: Search pages...
          - generic [ref=e59]: ⌘K
        - button "FF User Level 1 · 0 XP" [ref=e60]:
          - generic [ref=e62]: FF
          - generic [ref=e63]:
            - paragraph [ref=e64]: User
            - paragraph [ref=e65]: Level 1 · 0 XP
      - main [ref=e66]:
        - generic [ref=e67]:
          - heading "Welcome back" [level=1] [ref=e68]
          - paragraph [ref=e69]: Here's your fitness overview
        - generic [ref=e70]:
          - generic [ref=e71]:
            - generic [ref=e73]:
              - img [ref=e74]
              - text: Experience Points
            - generic [ref=e76]:
              - generic [ref=e77]:
                - generic [ref=e78]: "0"
                - generic [ref=e79]: XP
              - generic [ref=e80]:
                - generic [ref=e81]: Level 1
                - progressbar [ref=e82]
                - generic [ref=e84]: 100 XP
          - generic [ref=e85]:
            - generic [ref=e87]:
              - img [ref=e88]
              - text: Current Streak
            - generic [ref=e90]:
              - generic [ref=e91]:
                - generic [ref=e92]: "0"
                - generic [ref=e93]: days
              - paragraph [ref=e94]: Start a new streak today!
          - generic [ref=e95]:
            - generic [ref=e97]:
              - img [ref=e98]
              - text: Today's Activity
            - generic [ref=e102]:
              - generic [ref=e103]: "0"
              - generic [ref=e104]: / 3 logged
        - generic [ref=e105]:
          - generic [ref=e106]:
            - generic [ref=e107]: Today's Activity
            - generic [ref=e108]: Quick overview of what you've logged today
          - generic [ref=e110]:
            - generic [ref=e111]:
              - img [ref=e113]
              - generic [ref=e119]:
                - paragraph [ref=e120]: Workout
                - paragraph [ref=e121]: Not yet
            - generic [ref=e122]:
              - img [ref=e124]
              - generic [ref=e127]:
                - paragraph [ref=e128]: Nutrition
                - paragraph [ref=e129]: Not yet
            - generic [ref=e130]:
              - img [ref=e132]
              - generic [ref=e134]:
                - paragraph [ref=e135]: Sleep
                - paragraph [ref=e136]: Not yet
        - generic [ref=e137]:
          - link "Log Workout" [ref=e138] [cursor=pointer]:
            - /url: /workouts/new
            - button "Log Workout" [ref=e139]:
              - img [ref=e140]
              - text: Log Workout
          - link "Log Meal" [ref=e146] [cursor=pointer]:
            - /url: /nutrition
            - button "Log Meal" [ref=e147]:
              - img [ref=e148]
              - text: Log Meal
          - link "Log Sleep" [ref=e151] [cursor=pointer]:
            - /url: /sleep
            - button "Log Sleep" [ref=e152]:
              - img [ref=e153]
              - text: Log Sleep
        - generic [ref=e155]:
          - generic [ref=e156]:
            - generic [ref=e157]: Recent Activity
            - generic [ref=e158]: Your latest fitness activities
          - generic [ref=e160]:
            - img [ref=e161]
            - paragraph [ref=e163]: No activity yet
            - paragraph [ref=e164]: Start by logging your first workout, meal, or sleep session
  - button "Open Next.js Dev Tools" [ref=e170] [cursor=pointer]:
    - img [ref=e171]
  - alert [ref=e174]
```

# Test source

```ts
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
  117 |     await loginUser(page, userEmail);
  118 |     await page.goto('/nutrition');
  119 |     await page.waitForTimeout(2000);
  120 |     const hasForm = await page.locator('form, input, button:has-text("Log Meal"), a:has-text("New Meal")').isVisible({ timeout: 3000 }).catch(() => false);
  121 |     expect(hasForm).toBeTruthy();
  122 |   });
  123 | 
  124 |   test('sleep page loads and displays the form', async ({ page }) => {
  125 |     await loginUser(page, userEmail);
  126 |     await page.goto('/sleep');
  127 |     await page.waitForTimeout(2000);
  128 |     const hasForm = await page.locator('form, input, button:has-text("Log Sleep"), button:has-text("Add Sleep")').isVisible({ timeout: 3000 }).catch(() => false);
  129 |     expect(hasForm).toBeTruthy();
  130 |   });
  131 | 
  132 |   test('leaderboard page loads', async ({ page }) => {
  133 |     await loginUser(page, userEmail);
  134 |     await page.goto('/leaderboard');
  135 |     await page.waitForTimeout(2000);
  136 |     const loaded = await page.locator('text=Leaderboard, text=Rankings, text=XP, h1, h2').first().isVisible({ timeout: 3000 }).catch(() => false);
  137 |     expect(loaded).toBeTruthy();
  138 |   });
  139 | 
  140 |   test('profile page loads and shows user info', async ({ page }) => {
  141 |     await loginUser(page, userEmail);
  142 |     await page.goto('/profile');
  143 |     await page.waitForTimeout(2000);
  144 |     const hasProfile = await page.locator('text=Profile, text=E2E Real User, text=Settings').first().isVisible({ timeout: 3000 }).catch(() => false);
  145 |     expect(hasProfile).toBeTruthy();
  146 |   });
  147 | });
  148 | 
  149 | // ─── Error States ───────────────────────────────────────────────────────
  150 | 
  151 | test.describe('REAL FLOW: Error & Edge Cases', () => {
  152 |   test('login with wrong password shows error', async ({ page }) => {
  153 |     await page.goto('/auth/login');
  154 |     await page.locator('#email').fill('nonexistent@test.com');
  155 |     await page.locator('#password').fill('wrongpassword');
  156 |     await page.locator('button[type="submit"]').click();
  157 |     await page.waitForTimeout(3000);
  158 |     // Should show an error message (either inline or in a toast/alert)
  159 |     const hasError = await page.locator('.bg-red-500, [class*="error"], [class*="alert"], text=Invalid, text=Error, text=Incorrect').isVisible({ timeout: 3000 }).catch(() => false);
  160 |     // If no error visible, it might be a console error
  161 |     if (!hasError) {
  162 |       test.info().annotations.push({
  163 |         type: 'issue',
  164 |         description: 'Login with wrong credentials did not show a visible error message. Check the error handling in the login form.',
  165 |       });
  166 |     }
  167 |   });
  168 | 
  169 |   test('unauthenticated user redirected from protected pages', async ({ page }) => {
  170 |     await page.goto('/dashboard');
  171 |     await page.waitForTimeout(2000);
  172 |     // Should NOT be on dashboard if not logged in
> 173 |     expect(page.url()).not.toContain('/dashboard');
      |                            ^ Error: expect(received).not.toContain(expected) // indexOf
  174 |   });
  175 | });
  176 | 
```