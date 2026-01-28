const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  try {
    const root = `file://${path.join(process.cwd(), '/')}`;

    // Page to add apples
    const page = await context.newPage();
    await page.goto(root + 'product-apple.html');
    await page.waitForSelector('#addToBasket');
    for (let i = 0; i < 8; i++) {
      await page.click('#addToBasket');
      await page.waitForTimeout(50);
    }

    // Open basket and check counts
    const basket = await context.newPage();
    await basket.goto(root + 'basket.html');
    await basket.waitForSelector('#basketList');
    const basketText = await basket.$eval('#basketList', el => el.innerText);
    const orangeCount = (basketText.match(/Orange/g) || []).length;
    const appleCount = (basketText.match(/Apple/g) || []).length;

    console.log('Basket content:\n', basketText);
    console.log('Apple count:', appleCount, 'Orange count:', orangeCount);

    if (appleCount !== 8) {
      console.error('FAIL: expected 8 apples, got', appleCount);
      process.exit(1);
    }
    if (orangeCount !== 2) {
      console.error('FAIL: expected 2 free oranges, got', orangeCount);
      process.exit(1);
    }

    // Clear basket and add 3 apples -> expect 0 oranges
    await basket.click('#clearBasket');
    await basket.waitForTimeout(100);
    for (let i = 0; i < 3; i++) {
      await page.click('#addToBasket');
      await page.waitForTimeout(50);
    }
    await basket.reload();
    const basketText2 = await basket.$eval('#basketList', el => el.innerText);
    const orangeCount2 = (basketText2.match(/Orange/g) || []).length;
    const appleCount2 = (basketText2.match(/Apple/g) || []).length;
    console.log('After clearing and adding 3 apples:\n', basketText2);
    console.log('Apple count:', appleCount2, 'Orange count:', orangeCount2);

    if (appleCount2 !== 3 || orangeCount2 !== 0) {
      console.error('FAIL: expected 3 apples and 0 oranges, got', appleCount2, orangeCount2);
      process.exit(1);
    }

    console.log('PASS: Free orange logic works as expected');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    await browser.close();
    process.exit(1);
  }
})();
