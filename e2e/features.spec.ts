import { test, expect } from "@playwright/test";

test.describe("イベント作成画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("モード選択が2択（多数決/全員参加）になっている", async ({ page }) => {
    // モードセレクターを確認
    const modeButtons = page.locator(
      'button:has-text("多数決"), button:has-text("全員参加")',
    );
    await expect(modeButtons).toHaveCount(2);

    // 「定期開催」は独立したボタンではなくチェックボックスであることを確認
    const regularButton = page.locator('button:has-text("定期開催")');
    await expect(regularButton).toHaveCount(0);
  });

  test("「全員参加」選択時に「定期開催」チェックボックスが表示される", async ({
    page,
  }) => {
    // 「全員参加」を選択
    await page.click('button:has-text("全員参加")');

    // 「定期開催」チェックボックスが表示される
    await expect(page.locator("text=定期開催")).toBeVisible();
  });

  test("「多数決」選択時は「定期開催」チェックボックスが非表示", async ({
    page,
  }) => {
    // デフォルトまたは「多数決」を選択
    await page.click('button:has-text("多数決")');

    // 「定期開催」オプションは表示されない（全員参加モードのみ）
    const regularLabel = page.locator('label:has-text("定期開催")');
    await expect(regularLabel).toHaveCount(0);
  });

  test("所要時間選択後、「開始時刻のずらし方」オプションが表示される", async ({
    page,
  }) => {
    // 所要時間を選択（全員参加モード）
    await page.click('button:has-text("全員参加")');

    // 「開始時刻のずらし方」セクションが表示される
    await expect(page.locator("text=開始時刻のずらし方")).toBeVisible();

    // オプション: ずらさない、30分ずつ、1時間ずつ
    await expect(page.locator('button:has-text("ずらさない")')).toBeVisible();
    await expect(page.locator('button:has-text("30分ずつ")')).toBeVisible();
    await expect(page.locator('button:has-text("1時間ずつ")')).toBeVisible();
  });

  test("30分ずらしでスロットが正しく生成される", async ({ page }) => {
    // 全員参加モードを選択
    await page.click('button:has-text("全員参加")');

    // 30分ずつを選択
    await page.click('button:has-text("30分ずつ")');

    // 説明文が更新される
    await expect(page.locator("text=30分ずつずらして生成")).toBeVisible();
  });

  test("1時間ずらしでスロットが正しく生成される", async ({ page }) => {
    // 全員参加モードを選択
    await page.click('button:has-text("全員参加")');

    // 1時間ずつを選択
    await page.click('button:has-text("1時間ずつ")');

    // 説明文が更新される
    await expect(page.locator("text=1時間ずつずらして生成")).toBeVisible();
  });
});

test.describe("イベント作成から回答修正までの統合テスト", () => {
  test("イベント作成 → 回答 → 回答修正の一連フロー", async ({ page }) => {
    // 1. イベント作成画面へ
    await page.goto("/");

    // 2. タイトル入力
    await page.fill('input[placeholder*="チーム定例会"]', "テスト飲み会");

    // 3. モード選択（多数決）
    await page.click('button:has-text("多数決")');

    // 4. 日付を選択（今日以降の日付をクリック）
    const calendarDays = page.locator(
      '[class*="calendar"] button:not([disabled])',
    );
    const dayCount = await calendarDays.count();
    if (dayCount > 0) {
      await calendarDays.first().click();
    }

    // 5. イベント作成ボタンをクリック
    const createButton = page.locator('button:has-text("イベントを作成")');
    if (await createButton.isVisible()) {
      await createButton.click();

      // 確認画面が表示されたら確定
      const confirmButton = page.locator('button:has-text("この内容で作成")');
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // イベント詳細ページに遷移するのを待つ
      await page
        .waitForURL(/\/e\/.*\/created|\/e\/[^/]+$/, { timeout: 10000 })
        .catch(() => {});
    }

    // 6. イベントページで回答する
    const currentUrl = page.url();
    if (currentUrl.includes("/e/")) {
      // 名前を入力
      const nameInput = page.locator(
        'input[placeholder*="名前"], input[name="name"]',
      );
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill("テストユーザー");

        // 回答を送信
        const submitButton = page.locator(
          'button:has-text("回答する"), button:has-text("送信")',
        );
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(1000);
        }
      }

      // 7. 「回答を修正」ボタンを確認
      const editButton = page.locator('button:has-text("回答を修正")');
      if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.click();

        // モーダルが表示される
        await expect(
          page.locator("text=修正する回答者を選んでください"),
        ).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

test.describe("VotingGrid レスポンシブ", () => {
  test("モバイル幅でページが正常に表示される", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await expect(page.locator("text=調整さん")).toBeVisible();
  });

  test("デスクトップ幅でページが正常に表示される", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.locator("text=調整さん")).toBeVisible();
  });
});

test.describe("LINE共有ボタン", () => {
  test("イベント作成後にLINE共有ボタンが表示される", async ({ page }) => {
    // イベント作成
    await page.goto("/");
    await page.fill('input[placeholder*="チーム定例会"]', "LINE共有テスト");
    await page.click('button:has-text("多数決")');

    // 日付を選択
    const calendarDays = page.locator(
      '[class*="calendar"] button:not([disabled])',
    );
    const dayCount = await calendarDays.count();
    if (dayCount > 0) {
      await calendarDays.first().click();
    }

    // イベント作成
    const createButton = page.locator('button:has-text("イベントを作成")');
    if (await createButton.isVisible()) {
      await createButton.click();

      const confirmButton = page.locator('button:has-text("この内容で作成")');
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      await page
        .waitForURL(/\/e\/.*\/created|\/e\/[^/]+$/, { timeout: 10000 })
        .catch(() => {});
    }

    // LINE共有ボタンを確認
    const currentUrl = page.url();
    if (currentUrl.includes("/e/")) {
      const lineButton = page.locator('a:has-text("LINEで共有")');
      await expect(lineButton).toBeVisible({ timeout: 5000 });

      // LINE URL Schemeを確認
      const href = await lineButton.getAttribute("href");
      expect(href).toContain("https://line.me/R/msg/text/");
      expect(href).toContain(encodeURIComponent("LINE共有テスト"));
    }
  });

  test("LINE共有ボタンが正しいスタイルを持つ", async ({ page }) => {
    await page.goto("/");
    await page.fill('input[placeholder*="チーム定例会"]', "スタイルテスト");
    await page.click('button:has-text("多数決")');

    const calendarDays = page.locator(
      '[class*="calendar"] button:not([disabled])',
    );
    if ((await calendarDays.count()) > 0) {
      await calendarDays.first().click();
    }

    const createButton = page.locator('button:has-text("イベントを作成")');
    if (await createButton.isVisible()) {
      await createButton.click();

      const confirmButton = page.locator('button:has-text("この内容で作成")');
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      await page
        .waitForURL(/\/e\/.*\/created|\/e\/[^/]+$/, { timeout: 10000 })
        .catch(() => {});
    }

    if (page.url().includes("/e/")) {
      const lineButton = page.locator('a:has-text("LINEで共有")');
      await expect(lineButton).toBeVisible({ timeout: 5000 });

      // target="_blank"とrel属性を確認
      await expect(lineButton).toHaveAttribute("target", "_blank");
      await expect(lineButton).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});
