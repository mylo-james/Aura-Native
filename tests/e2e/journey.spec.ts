import {test, expect} from './fixtures';
import type {Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', {name: 'Try Aura', exact: true}).click();
  await expect(
    page.getByRole('heading', {name: 'How are you, right now?'}),
  ).toBeVisible();
}
async function fillMoment(page: Page, title = 'A quiet demo moment') {
  await page.getByRole('radio', {name: 'Okay', exact: true}).click();
  await page.getByRole('checkbox', {name: 'Sleep', exact: true}).click();
  await page.getByRole('button', {name: 'Continue', exact: true}).click();
  await page.getByLabel('A title (optional)', {exact: true}).fill(title);
  await page
    .getByLabel('Your reflection (optional)', {exact: true})
    .fill('A fictional morning.\nA little time to notice.');
}
test('production journal journey, isolated visitors, keyboard controls and responsive access', async ({
  page,
  browser,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/');
  await expect(
    page.getByRole('button', {name: 'Try Aura', exact: true}),
  ).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath('entry.png'),
    fullPage: true,
  });
  await start(page);
  await page.screenshot({
    path: testInfo.outputPath('checkin.png'),
    fullPage: true,
  });
  await page.getByRole('radio', {name: 'Low', exact: true}).focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('radio', {name: 'Tender', exact: true}),
  ).toBeChecked();
  await fillMoment(page);
  await page.getByRole('link', {name: 'Patterns', exact: true}).click();
  await expect(
    page.getByRole('heading', {name: /Notice the little/}),
  ).toBeVisible();
  await page.getByRole('link', {name: 'Check-in', exact: true}).click();
  await expect(
    page.getByLabel('A title (optional)', {exact: true}),
  ).toHaveValue('A quiet demo moment');
  await page.getByRole('button', {name: 'Save moment', exact: true}).click();
  await expect(
    page.getByRole('heading', {name: 'A moment, kept.'}),
  ).toBeVisible();
  await page.getByRole('button', {name: 'View this moment'}).click();
  const momentUrl = page.url();
  await expect(
    page.getByRole('heading', {name: 'A quiet demo moment', exact: true}),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', {name: 'A quiet demo moment', exact: true}),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('moment.png'),
    fullPage: true,
  });
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  const other = await browser.newContext({viewport: {width: 390, height: 844}});
  const second = await other.newPage();
  await start(second);
  await second.goto(momentUrl);
  await expect(
    second.getByRole('heading', {name: 'This moment isn’t here.'}),
  ).toBeVisible();
  await other.close();
  await page.getByRole('button', {name: 'Edit moment', exact: true}).click();
  await page
    .getByLabel('A title (optional)', {exact: true})
    .fill('Changes to discard');
  page.once('dialog', (d) => d.dismiss());
  await page.getByRole('button', {name: 'Cancel editing'}).click();
  await expect(
    page.getByLabel('A title (optional)', {exact: true}),
  ).toHaveValue('Changes to discard');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', {name: 'Cancel editing'}).click();
  await expect(
    page.getByRole('heading', {name: 'A quiet demo moment', exact: true}),
  ).toBeVisible();
  await page.getByRole('button', {name: 'Edit moment', exact: true}).click();
  await page
    .getByLabel('A title (optional)', {exact: true})
    .fill('A revised demo moment');
  await page.getByRole('radio', {name: 'Good', exact: true}).click();
  await page.getByRole('button', {name: 'Save changes', exact: true}).click();
  await expect(
    page.getByRole('heading', {name: 'A revised demo moment', exact: true}),
  ).toBeVisible();
  for (const size of [
    {width: 320, height: 568},
    {width: 375, height: 667},
    {width: 390, height: 844},
    {width: 430, height: 932},
    {width: 844, height: 390},
    {width: 1280, height: 900},
  ]) {
    await page.setViewportSize(size);
    await page.getByRole('link', {name: 'Check-in', exact: true}).click();
    await expect(
      page.getByRole('heading', {name: 'How are you, right now?'}),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const targets = await page
      .locator('button,a[href]')
      .evaluateAll((els) =>
        els
          .filter((e) => (e as HTMLElement).offsetParent !== null)
          .map((e) => ({
            name: e.getAttribute('aria-label') || e.textContent?.trim(),
            w: e.getBoundingClientRect().width,
            h: e.getBoundingClientRect().height,
          })),
      );
    expect(targets.filter((t) => t.w < 43.9 || t.h < 43.9)).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`checkin-${size.width}x${size.height}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({width: 390, height: 844});
  await page.emulateMedia({reducedMotion: 'reduce'});
  expect(
    await page
      .locator('.aura-character')
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe('none');
  await page.addStyleTag({content: ':root{font-size:32px!important}'});
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('radio', {name: 'Okay', exact: true}).click();
  await page.getByRole('button', {name: 'Continue', exact: true}).click();
  await expect(
    page.getByRole('button', {name: 'Save moment', exact: true}),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('text-200-percent.png'),
    fullPage: true,
  });
  await page.reload();
  const axe = await new AxeBuilder({page}).analyze();
  expect(axe.violations).toEqual([]);
  await page.goto(momentUrl);
  await page.getByRole('button', {name: 'Delete…', exact: true}).click();
  await page.getByRole('button', {name: 'Keep moment', exact: true}).click();
  await expect(
    page.getByRole('heading', {name: 'A revised demo moment', exact: true}),
  ).toBeVisible();
  await page.getByRole('button', {name: 'Delete…', exact: true}).click();
  await page.getByRole('button', {name: 'Delete moment', exact: true}).click();
  await expect(
    page.getByRole('heading', {name: 'Your moments', exact: true}),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {name: 'A revised demo moment', exact: true}),
  ).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath('moments.png'),
    fullPage: true,
  });
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.getByRole('link', {name: 'Patterns', exact: true}).click();
  await page.getByRole('radio', {name: '30 days', exact: true}).click();
  await expect(
    page.getByRole('heading', {name: '24 check-ins', exact: true}),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('patterns.png'),
    fullPage: true,
  });
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.getByRole('link', {name: 'About Aura and support'}).click();
  await expect(
    page.getByRole('button', {name: 'Reset demo…', exact: true}),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('about.png'),
    fullPage: true,
  });
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await expect(
    page.getByRole('link', {name: 'Call 988', exact: true}),
  ).toHaveAttribute('href', 'tel:988');
  await expect(
    page.getByRole('link', {name: 'Text 988', exact: true}),
  ).toHaveAttribute('href', 'sms:988');
  await page.getByRole('button', {name: 'Reset demo…', exact: true}).click();
  await page
    .getByRole('button', {name: 'Reset this demo', exact: true})
    .click();
  await expect(
    page.getByRole('heading', {name: 'How are you, right now?'}),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', {name: 'How are you, right now?'}),
  ).toBeVisible();
  expect(errors).toEqual([]);
  const storage = await page.evaluate(() => ({
    local: localStorage.length,
    session: sessionStorage.length,
  }));
  expect(storage).toEqual({local: 0, session: 0});
});
