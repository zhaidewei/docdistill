import { expect, test } from "@playwright/test";

test("desktop cards page renders browser and detail panes", async ({ page }) => {
  await page.goto("/cards");

  await expect(page.getByRole("link", { name: "卡片" })).toBeVisible();
  await expect(page.getByRole("button", { name: /全部/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /⭐/i })).toBeVisible();
});

test("graph page loads and links into the card reading flow", async ({ page }) => {
  await page.goto("/graph");

  await expect(page.getByRole("link", { name: "图谱" })).toBeVisible();
  await expect(page.locator("svg").first()).toBeVisible();
  await expect(page.getByText(/点击主题圆圈展开查看具体卡片/i)).toBeVisible();
});

test("notes page renders saved-content tabs and empty state", async ({ page }) => {
  await page.goto("/notes");

  await expect(page.getByRole("button", { name: /收藏/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /笔记/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /问题/i })).toBeVisible();
  await expect(page.getByText(/还没有收藏/i)).toBeVisible();
});
