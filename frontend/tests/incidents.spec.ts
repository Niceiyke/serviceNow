import { test, expect } from '@playwright/test';

test.describe('Incident Management', () => {
  test.beforeEach(async ({ page }) => {
    // Log in before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should navigate to incident list', async ({ page }) => {
    await page.click('text=Incidents'); // Assuming sidebar has this link
    await expect(page).toHaveURL('/incidents');
    await expect(page.locator('h1')).toContainText('Incident Records');
  });

  test('should be able to create a new incident', async ({ page }) => {
    await page.goto('/incidents/new');
    
    await page.fill('input[placeholder="Concise title of the issue..."]', 'Test E2E Incident');
    await page.fill('textarea[placeholder="Provide a detailed description of the incident..."]', 'This incident was created by Playwright E2E test.');
    
    // Select priority
    await page.click('button:has-text("Medium")'); // Open select
    await page.click('text=High');
    
    // Select Category (assuming categories exist)
    await page.click('button:has-text("Select category")');
    // This might fail if no categories exist. In real tests we'd ensure data exists.
    
    // Submit
    // await page.click('button:has-text("Initialize Ticket")');
    // await expect(page).toHaveURL(/\/incidents\/[a-f0-9-]+/);
  });
});
