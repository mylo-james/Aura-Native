import {test, expect} from './fixtures';
import {spawn} from 'node:child_process';

test('allowed same-site embed and cross-site cookie restriction both have a usable path', async ({
  page,
  demoOrigin,
}) => {
  test.skip(
    Boolean(process.env.AURA_E2E_URL),
    'The isolated harness origins are intentionally excluded from private HTTPS production.',
  );
  const port = Number(process.env.AURA_EMBED_PORT || 3112);
  const harness = spawn(process.execPath, ['tests/e2e/embed-server.mjs'], {
    env: {...process.env, AURA_EMBED_CHILD_ORIGIN: demoOrigin},
    stdio: 'ignore',
  });
  try {
    await expect
      .poll(async () => {
        if (harness.exitCode !== null)
          throw new Error(
            'Embed harness could not start; choose a free AURA_EMBED_PORT.',
          );
        try {
          return (await fetch(`http://127.0.0.1:${port}`)).status;
        } catch {
          return 0;
        }
      })
      .toBe(200);
    await page.goto(`http://127.0.0.1:${port}`);
    // The permanent link is usable by keyboard before entering the frame.
    await page
      .getByRole('link', {name: 'Open demo', exact: true})
      .press('Enter');
    await expect(page).toHaveURL(`${demoOrigin}/`);
    await expect(
      page.getByRole('button', {name: 'Try Aura', exact: true}),
    ).toBeVisible();
    await page.goto(`http://127.0.0.1:${port}`);
    const frame = page.frameLocator(
      'iframe[title="Aura interactive mood journal demo"]',
    );
    await frame.getByRole('button', {name: 'Try Aura', exact: true}).click();
    await expect(
      frame.getByRole('heading', {name: 'How are you, right now?'}),
    ).toBeVisible();
    await expect(
      page.getByRole('link', {name: 'Open demo', exact: true}),
    ).toHaveAttribute('href', `${demoOrigin}/`);
    // localhost and 127.0.0.1 are different sites. SameSite=Lax cookies cannot
    // authenticate the iframe POST here, exercising an actual browser boundary.
    await page.context().clearCookies();
    await page.goto(`http://localhost:${port}`);
    await frame.getByRole('button', {name: 'Try Aura', exact: true}).click();
    await expect(
      frame.getByRole('link', {name: 'Open Aura directly'}),
    ).toBeVisible();
    // Scroll the parent back to its visible escape link before pointer input.
    // Chrome's automated auto-scroll after iframe focus can consume the first
    // click without dispatching a pointer event to the newly visible anchor.
    await page.mouse.move(8, 8);
    await page.mouse.wheel(0, -1600);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.getByRole('link', {name: 'Open demo', exact: true}).click();
    await expect(page).toHaveURL(`${demoOrigin}/`);
    await page.getByRole('button', {name: 'Try Aura', exact: true}).click();
    await expect(
      page.getByRole('heading', {name: 'How are you, right now?'}),
    ).toBeVisible();
    // Also exercise the child's escape link. Both paths replace the frame
    // with a top-level page and do not depend on browser popup policy.
    await page.context().clearCookies();
    await page.goto(`http://localhost:${port}`);
    await frame.getByRole('button', {name: 'Try Aura', exact: true}).click();
    await frame
      .getByRole('link', {name: 'Open Aura directly', exact: true})
      .click();
    await expect(page).toHaveURL(`${demoOrigin}/`);
    await page.getByRole('button', {name: 'Try Aura', exact: true}).click();
    await expect(
      page.getByRole('heading', {name: 'How are you, right now?'}),
    ).toBeVisible();
  } finally {
    if (harness.exitCode === null) {
      const exited = new Promise<void>((resolve) =>
        harness.once('exit', () => resolve()),
      );
      harness.kill('SIGTERM');
      await Promise.race([
        exited,
        new Promise<void>((resolve) => setTimeout(resolve, 2000)),
      ]);
      if (harness.exitCode === null) harness.kill('SIGKILL');
    }
  }
});
