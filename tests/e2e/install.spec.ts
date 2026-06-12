import { test, expect } from '@playwright/test'

test('app renders group list', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.sidebar')).toBeVisible()
  await expect(page.locator('.sidebar-header')).toHaveText('skills')
  await expect(page.locator('.page-title')).toHaveText('技能组')
})

test('sidebar navigation works', async ({ page }) => {
  await page.goto('/')
  await page.locator('a:has-text("同步状态")').click()
  await expect(page.locator('.page-title')).toHaveText('同步状态')

  await page.locator('a:has-text("设置")').click()
  await expect(page.locator('.page-title')).toHaveText('设置')

  await page.locator('a:has-text("所有技能组")').click()
  await expect(page.locator('.page-title')).toHaveText('技能组')
})
