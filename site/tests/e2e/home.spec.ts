import { expect, test } from "@playwright/test";

test("homepage exposes primary learning entry points", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: /碎片时间/i })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /开始学习/i }).first()
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /浏览知识图谱/i }).first()
  ).toBeVisible();
});

test("homepage can navigate to the cards experience", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: /开始学习/i }).first().click();

  await expect(page).toHaveURL(/\/cards$/);
  await expect(page.getByRole("link", { name: "卡片" })).toBeVisible();
});
