import { test, expect } from '@playwright/test';

test.describe('Smoke Test', () => {
  test('should load landing page', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page.locator('h1')).toContainText('Fund Community Projects');
  });

  test('should navigate to dashboard and view projects', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.click('a[href="/dashboard"]');
    await expect(page).toHaveURL('http://localhost:5173/dashboard');
    await expect(page.locator('h1')).toContainText('Community Projects');
  });

  test('should view project detail', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard');

    // Wait for projects to load
    await page.waitForSelector('.shadow-md', { timeout: 5000 });

    // Click first project
    const firstProject = page.locator('.shadow-md').first();
    await firstProject.click();

    // Should be on project detail page
    await expect(page).toHaveURL(/\/projects\/.+/);

    // Should see milestones section
    await expect(page.locator('text=Milestones')).toBeVisible();
  });

  test('should navigate to create project page', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.click('a[href="/create"]');
    await expect(page).toHaveURL('http://localhost:5173/create');
    await expect(page.locator('h1')).toContainText('Create Project with AI');
  });
});
