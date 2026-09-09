import {test, expect} from './fixtures';
import AxeBuilder from '@axe-core/playwright';

test('appearance is applied before the application bundle runs', async ({
  browser,
  demoOrigin,
}) => {
  for (const scenario of [
    {device: 'dark', saved: null, expected: 'dark'},
    {device: 'light', saved: 'dark', expected: 'dark'},
    {device: 'dark', saved: 'light', expected: 'light'},
    {device: 'dark', saved: 'invalid', expected: 'dark'},
  ] as const) {
    const context = await browser.newContext({colorScheme: scenario.device});
    try {
      if (scenario.saved)
        await context.addInitScript((value) => {
          localStorage.setItem('aura.appearance.v1', value);
        }, scenario.saved);
      const page = await context.newPage();
      // A failed app bundle still leaves the early appearance script and CSS
      // in control of the initial canvas, before React can apply the theme.
      await page.route('**/_expo/static/js/web/entry-*.js', (route) =>
        route.abort(),
      );
      await page.goto(demoOrigin);
      await expect(page.locator('html')).toHaveAttribute(
        'data-theme',
        scenario.expected,
      );
      expect(
        await page
          .locator('html')
          .evaluate((el) => getComputedStyle(el).colorScheme),
      ).toBe(scenario.expected);
      await expect(page.locator('#root')).toBeEmpty();
      const response = await page.request.get(
        demoOrigin + '/assets/appearance.js',
      );
      expect(response.ok()).toBe(true);
      expect(response.headers()['content-type']).toContain('javascript');
      expect(response.headers()['cache-control']).toBe('no-cache');
    } finally {
      await context.close();
    }
  }
});

test('system changes, explicit override, reload, and cross-tab preference stay consistent', async ({
  page,
  context,
  demoOrigin,
}) => {
  await page.emulateMedia({colorScheme: 'dark'});
  await page.goto('/about');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(
    page.getByRole('radio', {name: 'System', exact: true}),
  ).toBeChecked();
  await page.emulateMedia({colorScheme: 'light'});
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', {name: 'Switch to dark mode'}).click();
  await expect(
    page.getByRole('radio', {name: 'Dark', exact: true}),
  ).toBeChecked();
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  expect(
    await page.evaluate(() => localStorage.getItem('aura.appearance.v1')),
  ).toBe('dark');
  await page.emulateMedia({colorScheme: 'dark'});
  await page.emulateMedia({colorScheme: 'light'});
  await expect(html).toHaveAttribute('data-theme', 'dark');
  const second = await context.newPage();
  await second.emulateMedia({colorScheme: 'light'});
  await second.goto(demoOrigin + '/about');
  await expect(second.locator('html')).toHaveAttribute('data-theme', 'dark');
  await second.getByText('Light', {exact: true}).click();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect(
    page.getByRole('radio', {name: 'Light', exact: true}),
  ).toBeChecked();
  await page
    .getByRole('radio', {name: 'Light', exact: true})
    .press('ArrowRight');
  await expect(
    page.getByRole('radio', {name: 'Dark', exact: true}),
  ).toBeChecked();
  await page
    .getByRole('radio', {name: 'Dark', exact: true})
    .press('ArrowRight');
  await expect(
    page.getByRole('radio', {name: 'System', exact: true}),
  ).toBeChecked();
  await expect(html).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await expect(
    second.getByRole('radio', {name: 'System', exact: true}),
  ).toBeChecked();
  await second.close();
});

test('appearance works when browser storage is unavailable', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage unavailable', 'SecurityError');
      },
    });
  });
  await page.emulateMedia({colorScheme: 'light'});
  await page.goto('/about');
  await page.getByText('Dark', {exact: true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(
    page.getByText(
      'This browser couldn’t remember your choice. It will last until you reload.',
    ),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(errors).toEqual([]);
});

test('dark journal flow and both palettes remain readable on mobile and desktop', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.emulateMedia({colorScheme: 'dark', reducedMotion: 'reduce'});
  await page.goto('/');
  await expect(page).toHaveTitle('Aura');
  await expect(
    page.getByRole('button', {name: 'Try Aura', exact: true}),
  ).toBeVisible();
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('dark-entry.png'),
    fullPage: true,
  });
  await page.getByRole('button', {name: 'Try Aura', exact: true}).click();
  await expect(
    page.getByRole('heading', {name: 'How are you, right now?'}),
  ).toBeVisible();
  await page.getByRole('radio', {name: 'Good', exact: true}).click();
  await page.getByRole('checkbox', {name: 'Hobbies', exact: true}).click();
  await page.screenshot({
    path: testInfo.outputPath('dark-check-in.png'),
    fullPage: true,
  });
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.getByRole('button', {name: 'Continue', exact: true}).click();
  await page
    .getByLabel('A title (optional)', {exact: true})
    .fill('A fictional evening');
  await page
    .getByLabel('Your reflection (optional)', {exact: true})
    .fill('Testing the night palette with made-up details.');
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('dark-reflection.png'),
    fullPage: true,
  });
  await page.getByRole('button', {name: 'Save moment', exact: true}).click();
  await expect(
    page.getByRole('heading', {name: 'A moment, kept.'}),
  ).toBeVisible();
  await page.getByRole('button', {name: 'View this moment'}).click();
  await expect(
    page.getByRole('heading', {name: 'A fictional evening', exact: true}),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', {name: 'A fictional evening', exact: true}),
  ).toBeVisible();
  for (const size of [
    {width: 390, height: 844},
    {width: 1280, height: 900},
    {width: 320, height: 568},
  ]) {
    await page.setViewportSize(size);
    for (const theme of ['dark', 'light'] as const) {
      await page.emulateMedia({colorScheme: theme});
      for (const [route, heading] of [
        ['/check-in', 'How are you, right now?'],
        ['/moments', 'Your moments'],
        ['/patterns', 'Notice the little things.'],
        ['/about', 'A little about Aura.'],
      ] as const) {
        await page.goto(route);
        await expect(
          page.getByRole('heading', {name: heading, exact: true}),
        ).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
        await page.screenshot({
          path: testInfo.outputPath(
            `${theme}-${route.slice(1)}-${size.width}.png`,
          ),
          fullPage: true,
        });
      }
    }
  }
  await page.emulateMedia({colorScheme: 'dark'});
  await page.addStyleTag({content: ':root{font-size:32px!important}'});
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByText('Light', {exact: true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(errors).toEqual([]);
});
