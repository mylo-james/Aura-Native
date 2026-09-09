import {test, expect} from './fixtures';

test('real wheel scrolling reaches long content and keeps it inside the app canvas', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', {name: 'Try Aura', exact: true}).click();
  await page.getByRole('link', {name: 'About Aura and support'}).click();
  await expect(
    page.getByRole('heading', {name: 'A little about Aura.'}),
  ).toBeVisible();
  await page.mouse.move(190, 400);
  await page.mouse.wheel(0, 900);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(100);
  expect(
    await page
      .locator('.app-shell')
      .evaluate(
        (element) =>
          element.getBoundingClientRect().bottom + window.scrollY >=
          document.documentElement.scrollHeight - 2,
      ),
  ).toBe(true);
  await page
    .getByRole('link', {name: 'Call 988', exact: true})
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole('link', {name: 'Call 988', exact: true}),
  ).toBeVisible();
});
