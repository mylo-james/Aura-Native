import {test, expect} from './fixtures';
import {readdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';

test('five cold production loads meet the approved local mobile budget', async ({
  browser,
  demoOrigin,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chrome' || Boolean(process.env.AURA_E2E_URL),
    'Chrome local lab budget only.',
  );
  const results: {
    lcpMs: number;
    transferredBytes: number;
    externalRequests: string[];
  }[] = [];
  const bundleDir = 'client/dist/_expo/static/js/web';
  const files = (await readdir(bundleDir)).filter((file) =>
    file.endsWith('.js'),
  );
  const gzipBytes = (
    await Promise.all(
      files.map(
        async (file) => gzipSync(await readFile(join(bundleDir, file))).length,
      ),
    )
  ).reduce((a, b) => a + b, 0);
  expect(gzipBytes).toBeLessThanOrEqual(600 * 1024);
  for (let run = 0; run < 5; run++) {
    const context = await browser.newContext({
      viewport: {width: 390, height: 844},
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', {cacheDisabled: true});
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: 1_600_000 / 8,
      uploadThroughput: 750_000 / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
    let transferredBytes = 0;
    cdp.on('Network.loadingFinished', (event) => {
      transferredBytes += event.encodedDataLength;
    });
    const externalRequests: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== demoOrigin)
        externalRequests.push(request.url());
    });
    await page.addInitScript(() => {
      Object.assign(window, {auraLcp: 0});
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        Object.assign(window, {auraLcp: entries.at(-1)?.startTime || 0});
      }).observe({type: 'largest-contentful-paint', buffered: true});
    });
    await page.goto(demoOrigin);
    await expect(
      page.getByRole('button', {name: 'Try Aura', exact: true}),
    ).toBeEnabled();
    await expect
      .poll(async () =>
        page
          .locator('img')
          .evaluateAll(
            (images) =>
              images.length >= 3 &&
              images.every((image) => image.complete && image.naturalWidth > 0),
          ),
      )
      .toBe(true);
    await expect
      .poll(async () =>
        page
          .locator('img')
          .evaluateAll(
            (images) =>
              images.length >= 3 &&
              images.every((image) => image.complete && image.naturalWidth > 0),
          ),
      )
      .toBe(true);
    await page.waitForLoadState('networkidle');
    const lcpMs = await page.evaluate(
      () => Reflect.get(window, 'auraLcp') as number,
    );
    results.push({lcpMs, transferredBytes, externalRequests});
    await context.close();
  }
  const medianLcpMs = results
    .map((result) => result.lcpMs)
    .sort((a, b) => a - b)[2];
  const report = {
    browser: browser.version(),
    viewport: '390x844',
    network: {
      downstreamBitsPerSecond: 1_600_000,
      upstreamBitsPerSecond: 750_000,
      latencyMs: 150,
      cpuSlowdown: 4,
    },
    gzipBytes,
    medianLcpMs,
    results,
  };
  await writeFile(
    testInfo.outputPath('performance.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(JSON.stringify(report));
  expect(
    results.every(
      (result) =>
        result.lcpMs > 0 &&
        result.transferredBytes <= 900 * 1024 &&
        result.externalRequests.length === 0,
    ),
  ).toBe(true);
  expect(medianLcpMs).toBeLessThanOrEqual(2500);
});
