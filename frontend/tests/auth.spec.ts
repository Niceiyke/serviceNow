import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should log in successfully with valid credentials', async ({ page }) => {
    // Note: This test assumes there is a user in the DB
    // In a real CI environment, we would seed the DB first
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password');
    
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('System Performance');
  });

  test('should show error message on invalid login', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    // Check for toast error message (sonner toast)
    await expect(page.locator('text=Login Failed')).toBeVisible();
  });
});
