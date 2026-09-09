import {test as base, expect} from '@playwright/test';
import {spawn, spawnSync, type ChildProcess} from 'node:child_process';
import {mkdtemp, rm} from 'node:fs/promises';
import {createServer, type AddressInfo} from 'node:net';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const running = (child: ChildProcess) =>
  child.exitCode === null && child.signalCode === null;
async function stop(child: ChildProcess) {
  if (!running(child)) return;
  const exited = new Promise<void>((resolve) =>
    child.once('exit', () => resolve()),
  );
  const deadline = setTimeout(() => {
    if (running(child)) child.kill('SIGKILL');
  }, 4000);
  child.kill('SIGTERM');
  await exited;
  clearTimeout(deadline);
}
async function availablePort() {
  const socket = createServer();
  await new Promise<void>((resolve, reject) => {
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', () => resolve());
  });
  const port = (socket.address() as AddressInfo).port;
  await new Promise<void>((resolve, reject) =>
    socket.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}
export const test = base.extend<{demoOrigin: string}>({
  demoOrigin: [
    async ({}, use, testInfo) => {
      if (process.env.AURA_E2E_URL) {
        await use(process.env.AURA_E2E_URL);
        return;
      }
      const state = await mkdtemp(join(tmpdir(), 'aura-browser-'));
      let service: ChildProcess | undefined;
      try {
        const port = process.env.AURA_E2E_PORT_BASE
          ? Number(process.env.AURA_E2E_PORT_BASE) + testInfo.workerIndex
          : await availablePort();
        const origin = `http://127.0.0.1:${port}`;
        const root = resolve('.');
        const env = {
          ...process.env,
          AURA_DEMO_STATE_DIR: state,
          AURA_EXTERNAL_ORIGIN: origin,
          AURA_ALLOW_INSECURE_LOOPBACK: '1',
          AURA_DEMO_STATIC_DIR: join(root, 'client/dist'),
          AURA_FRAME_ANCESTORS: `http://127.0.0.1:${process.env.AURA_EMBED_PORT || 3112},http://localhost:${process.env.AURA_EMBED_PORT || 3112}`,
          PYTHONDONTWRITEBYTECODE: '1',
        };
        const python = join(root, 'backend/.venv-demo/bin/python');
        const command = join(root, 'backend/serve_demo.py');
        const init = spawnSync(python, [command, '--init-state'], {
          env,
          encoding: 'utf8',
          timeout: 30000,
        });
        if (init.status !== 0)
          throw new Error(`Demo initialization failed: ${init.stderr}`);
        service = spawn(python, [command, '--port', String(port)], {
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let diagnostics = '';
        let listening = false;
        service.stderr?.on('data', (chunk) => {
          diagnostics += String(chunk);
        });
        service.stdout?.on('data', (chunk) => {
          if (String(chunk).includes(`listening on ${origin}`))
            listening = true;
        });
        let ready = false;
        const deadline = Date.now() + 30000;
        while (Date.now() < deadline) {
          if (!running(service))
            throw new Error(`Demo exited before readiness: ${diagnostics}`);
          // Require our child's successful bind before probing. Another local
          // listener must never count as this fixture's production server.
          if (listening) {
            try {
              const response = await fetch(`${origin}/api/health`, {
                signal: AbortSignal.timeout(1500),
              });
              if (response.ok) {
                ready = true;
                break;
              }
            } catch {}
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        if (!ready)
          throw new Error(`Demo did not become ready: ${diagnostics}`);
        await use(origin);
      } finally {
        if (service) await stop(service);
        await rm(state, {recursive: true, force: true});
      }
    },
    {auto: true},
  ],
  baseURL: async ({demoOrigin}, use) => {
    await use(demoOrigin);
  },
});
export {expect};
