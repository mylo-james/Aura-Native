import {type Page, type Route} from '@playwright/test';
import {expect, test} from './fixtures';

async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', {name: 'Try Aura', exact: true}).click();
  await expect(
    page.getByRole('heading', {name: 'How are you, right now?'}),
  ).toBeVisible();
}

async function draftMoment(page: Page, title: string) {
  await page.getByRole('radio', {name: 'Okay', exact: true}).click();
  await page.getByRole('checkbox', {name: 'Sleep', exact: true}).click();
  await page.getByRole('button', {name: 'Continue', exact: true}).click();
  await page.getByLabel('A title (optional)', {exact: true}).fill(title);
  await page
    .getByLabel('Your reflection (optional)', {exact: true})
    .fill('A fictional reflection retained while Aura recovers.');
}

async function interceptOnce(
  page: Page,
  handler: (route: Route) => Promise<void>,
) {
  let intercepted = false;
  await page.route('**/api/moments', async (route) => {
    if (route.request().method() !== 'POST' || intercepted) {
      await route.continue();
      return;
    }
    intercepted = true;
    await handler(route);
  });
  return () => page.unroute('**/api/moments');
}

test('retries a refreshed CSRF token without losing the pending draft', async ({
  page,
}) => {
  await start(page);
  await draftMoment(page, 'CSRF retry');
  const removeRoute = await interceptOnce(page, async (route) => {
    await route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {code: 'csrf', message: 'Refresh the token.'},
      }),
    });
  });
  await page.getByRole('button', {name: 'Save moment', exact: true}).click();
  await expect(
    page.getByRole('heading', {name: 'A moment, kept.'}),
  ).toBeVisible();
  await removeRoute();
});

test('coalesces bootstrap refreshes before the first demo POST', async ({page}) => {
  let bootstrapReads = 0;
  let initialBootstrapRequested!: () => void;
  const initialBootstrap = new Promise<void>((resolve) => {
    initialBootstrapRequested = resolve;
  });
  let releaseInitialBootstrap!: () => void;
  const initialBootstrapHeld = new Promise<void>((resolve) => {
    releaseInitialBootstrap = resolve;
  });
  const postStatuses: number[] = [];
  await page.route('**/api/demo', async (route) => {
    if (route.request().method() === 'GET') {
      bootstrapReads++;
      if (bootstrapReads === 1) {
        initialBootstrapRequested();
        await initialBootstrapHeld;
      }
      const response = await route.fetch();
      await route.fulfill({response});
      return;
    }
    if (route.request().method() === 'POST') {
      const response = await route.fetch();
      postStatuses.push(response.status());
      await route.fulfill({response});
      return;
    }
    await route.continue();
  });
  await page.goto('/');
  await initialBootstrap;
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(100);
  expect(bootstrapReads).toBe(1);
  releaseInitialBootstrap();
  await expect(
    page.getByRole('button', {name: 'Try Aura', exact: true}),
  ).toBeEnabled();
  await page.getByRole('button', {name: 'Try Aura', exact: true}).click();
  await expect(
    page.getByRole('heading', {name: 'How are you, right now?'}),
  ).toBeVisible();
  expect(postStatuses).toEqual([201]);
});

for (const [name, status, headers, code] of [
  ['a 500 response', 500, {}, 'server_error'],
  ['a 429 response', 429, {'Retry-After': '1'}, 'rate_limited'],
] as const) {
  test(`keeps a draft after ${name}`, async ({page}) => {
    await start(page);
    await draftMoment(page, name);
    const removeRoute = await interceptOnce(page, async (route) => {
      await route.fulfill({
        status,
        headers: {'Content-Type': 'application/json', ...headers},
        body: JSON.stringify({error: {code, message: `Simulated ${status}.`}}),
      });
    });
    await page.getByRole('button', {name: 'Save moment', exact: true}).click();
    await expect(
      page.getByText(status === 429 ? /little pause/i : `Simulated ${status}.`),
    ).toBeVisible();
    await expect(
      page.getByLabel('A title (optional)', {exact: true}),
    ).toHaveValue(name);
    await removeRoute();
    await page.getByRole('button', {name: 'Save moment', exact: true}).click();
    await expect(
      page.getByRole('heading', {name: 'A moment, kept.'}),
    ).toBeVisible();
  });
}

test('clears a draft after an authenticated 401 instead of carrying it into a fresh demo', async ({
  page,
}) => {
  await start(page);
  await draftMoment(page, 'Must not cross sessions');
  const removeRoute = await interceptOnce(page, async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {code: 'expired', message: 'Session expired.'},
      }),
    });
  });
  await page.getByRole('button', {name: 'Save moment', exact: true}).click();
  await expect(
    page.getByRole('heading', {name: 'A fresh start is here.'}),
  ).toBeVisible();
  await removeRoute();
  await page.getByRole('button', {name: 'Try Aura', exact: true}).click();
  await expect(
    page.getByRole('heading', {name: 'How are you, right now?'}),
  ).toBeVisible();
  await expect(
    page.getByLabel('A title (optional)', {exact: true}),
  ).toHaveCount(0);
});

test('recovers a lost POST response with the same idempotency key and one visible moment', async ({
  page,
}) => {
  await start(page);
  await draftMoment(page, 'Lost response retry');
  const removeRoute = await interceptOnce(page, async (route) => {
    await route.fetch();
    await route.abort('connectionreset');
  });
  await page.getByRole('button', {name: 'Save moment', exact: true}).click();
  await expect(page.getByText(/connection was interrupted/i)).toBeVisible();
  await removeRoute();
  await page.getByRole('button', {name: 'Save moment', exact: true}).click();
  await expect(
    page.getByRole('heading', {name: 'A moment, kept.'}),
  ).toBeVisible();
  await page.getByRole('button', {name: 'View this moment'}).click();
  await expect(
    page.getByRole('heading', {name: 'Lost response retry', exact: true}),
  ).toBeVisible();
  await page
    .getByRole('button', {name: 'Back to moments', exact: true})
    .click();
  await expect(
    page.getByText('Lost response retry', {exact: true}),
  ).toHaveCount(1);
});

test('a reset in another tab invalidates an in-flight save without showing stale state', async ({
  page,
  context,
}) => {
  await start(page);
  await draftMoment(page, 'Old generation');
  let releaseResponse: (() => void) | undefined;
  const responseHeld = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  let postReached: (() => void) | undefined;
  const postStarted = new Promise<void>((resolve) => {
    postReached = resolve;
  });
  let postFinished: (() => void) | undefined;
  const postCompleted = new Promise<void>((resolve) => {
    postFinished = resolve;
  });
  const removeRoute = await interceptOnce(page, async (route) => {
    const response = await route.fetch();
    postReached?.();
    await responseHeld;
    await route.fulfill({response});
    postFinished?.();
  });
  await page.getByRole('button', {name: 'Save moment', exact: true}).click();
  await postStarted;
  const other = await context.newPage();
  await other.goto('/about');
  await other.getByRole('button', {name: 'Reset demo…', exact: true}).click();
  await other
    .getByRole('button', {name: 'Reset this demo', exact: true})
    .click();
  await expect(
    other.getByRole('heading', {name: 'How are you, right now?'}),
  ).toBeVisible();
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(
    page.getByRole('heading', {name: 'How are you, right now?'}),
  ).toBeVisible();
  releaseResponse?.();
  await postCompleted;
  await page.waitForTimeout(100);
  await expect(page.getByText(/demo has ended|obsolete_session/i)).toHaveCount(
    0,
  );
  await expect(
    page.getByLabel('A title (optional)', {exact: true}),
  ).toHaveCount(0);
  await removeRoute();
  await other.close();
});

test('dirty moment editing protects browser Back and tab navigation until the visitor accepts discard', async ({
  page,
}) => {
  await start(page);
  await draftMoment(page, 'Original saved title');
  await page.getByRole('button', {name: 'Save moment', exact: true}).click();
  await page.getByRole('button', {name: 'View this moment'}).click();
  const momentUrl = page.url();
  await page.getByRole('button', {name: 'Edit moment', exact: true}).click();
  await page
    .getByLabel('A title (optional)', {exact: true})
    .fill('Unsaved browser back');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.goBack({waitUntil: 'commit', timeout: 5000}).catch(() => null);
  await expect(
    page.getByLabel('A title (optional)', {exact: true}),
  ).toHaveValue('Unsaved browser back');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('link', {name: 'Patterns', exact: true}).click();
  await expect(
    page.getByLabel('A title (optional)', {exact: true}),
  ).toHaveValue('Unsaved browser back');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('link', {name: 'Patterns', exact: true}).click();
  await expect(
    page.getByRole('heading', {name: /Notice the little/}),
  ).toBeVisible();
  await page.goto(momentUrl);
  await expect(
    page.getByRole('heading', {name: 'Original saved title', exact: true}),
  ).toBeVisible();
  await expect(
    page.getByText('Unsaved browser back', {exact: true}),
  ).toHaveCount(0);
});

test('title and reflection limits remain usable at 320px through reload and editing', async ({
  page,
}) => {
  const title = 'T'.repeat(50);
  const body = 'B'.repeat(2000);
  await page.setViewportSize({width: 320, height: 568});
  await start(page);
  await page.getByRole('radio', {name: 'Okay', exact: true}).click();
  await page.getByRole('button', {name: 'Continue', exact: true}).click();
  await page.getByLabel('A title (optional)', {exact: true}).fill(title);
  await page.getByLabel('Your reflection (optional)', {exact: true}).fill(body);
  const save = page.getByRole('button', {name: 'Save moment', exact: true});
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeVisible();
  await save.click();
  await page.getByRole('button', {name: 'View this moment'}).click();
  const momentUrl = page.url();
  await page.reload();
  await expect(
    page.getByRole('heading', {name: title, exact: true}),
  ).toBeVisible();
  const edit = page.getByRole('button', {name: 'Edit moment', exact: true});
  await edit.scrollIntoViewIfNeeded();
  await expect(edit).toBeVisible();
  await edit.click();
  await expect(
    page.getByLabel('A title (optional)', {exact: true}),
  ).toHaveValue(title);
  await expect(
    page.getByLabel('Your reflection (optional)', {exact: true}),
  ).toHaveValue(body);
  await page.goto(momentUrl);
  await expect(
    page.getByRole('heading', {name: title, exact: true}),
  ).toBeVisible();
});

test('starting a demo does not override a newer navigation while its response is pending', async ({
  page,
}) => {
  let release!: () => void;
  let requested!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const pending = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route('**/api/demo', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch();
    requested();
    await gate;
    await route.fulfill({response});
  });
  await page.goto('/');
  await page.getByRole('button', {name: 'Try Aura', exact: true}).click();
  await pending;
  try {
    await page.getByRole('link', {name: 'About Aura and support'}).click();
    await expect(
      page.getByRole('heading', {name: 'A little about Aura.'}),
    ).toBeVisible();
  } finally {
    release();
  }
  await expect(
    page.getByRole('navigation', {name: 'Main navigation'}),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {name: 'A little about Aura.'}),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/about$/);
});
