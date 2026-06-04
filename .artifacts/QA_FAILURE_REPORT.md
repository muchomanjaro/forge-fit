# QA Failure Report

Exit code: 1
Failure count: 4

## Test Output
ord shows error (3.4s)
  ✘  25 [chromium] › e2e/real-user-flow.spec.ts:169:7 › REAL FLOW: Error & Edge Cases › unauthenticated user redirected from protected pages (2.3s)


  1) [chromium] › e2e/real-user-flow.spec.ts:47:7 › REAL FLOW: Full Auth Lifecycle › register → login → protected page → logout → protected page blocked 

    TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
    =========================== logs ===========================
    waiting for navigation until "load"
    ============================================================

      14 |   await page.locator('button[type="submit"]').click();
      15 |   // Wait for redirect — should go to /onboarding or /dashboard
    > 16 |   await page.waitForURL(/onboarding|\/dashboard/, { timeout: 20000 });
         |              ^
      17 |   expect(page.url()).not.toContain('/auth/register');
      18 |   return email;
      19 | }
        at registerUser (/Users/asd/forge-fit/e2e/real-user-flow.spec.ts:16:14)
        at /Users/asd/forge-fit/e2e/real-user-flow.spec.ts:49:19

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/real-user-flow-REAL-FLOW-F-b8b1e-ut-→-protected-page-blocked-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/real-user-flow-REAL-FLOW-F-b8b1e-ut-→-protected-page-blocked-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/real-user-flow-REAL-FLOW-F-b8b1e-ut-→-protected-page-blocked-chromium/error-context.md

  2) [chromium] › e2e/real-user-flow.spec.ts:107:7 › REAL FLOW: Feature Data Flow › workout page loads and displays the form 

    TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
    =========================== logs ===========================
    waiting for navigation until "load"
    ============================================================

      14 |   await page.locator('button[type="submit"]').click();
      15 |   // Wait for redirect — should go to /onboarding or /dashboard
    > 16 |   await page.waitForURL(/onboarding|\/dashboard/, { timeout: 20000 });
         |              ^
      17 |   expect(page.url()).not.toContain('/auth/register');
      18 |   return email;
      19 | }
        at registerUser (/Users/asd/forge-fit/e2e/real-user-flow.spec.ts:16:14)
        at /Users/asd/forge-fit/e2e/real-user-flow.spec.ts:103:17

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/real-user-flow-REAL-FLOW-F-94354-loads-and-displays-the-form-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/real-user-f

## Stderr
(node:87118) [DEP0205] DeprecationWarning: `module.register()` is deprecated. Use `module.registerHooks()` instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:87119) [DEP0205] DeprecationWarning: `module.register()` is deprecated. Use `module.registerHooks()` instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:87172) [DEP0205] DeprecationWarning: `module.register()` is deprecated. Use `module.registerHooks()` instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:87191) [DEP0205] DeprecationWarning: `module.register()` is deprecated. Use `module.registerHooks()` instead.
(Use `node --trace-deprecation ...` to show where the warning was created)

