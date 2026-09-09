import {createServer} from 'node:http';
const childOrigin =
  process.env.AURA_EMBED_CHILD_ORIGIN || 'http://127.0.0.1:3111';
const url = new URL(childOrigin);
if (!['http:', 'https:'].includes(url.protocol) || url.origin !== childOrigin)
  throw new Error('Expected an exact child origin');
const safe = childOrigin
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aura portfolio embed check</title><style>body{font:16px/1.5 system-ui;background:#eeedf2;color:#252b4b;margin:24px}main{max-width:750px;margin:auto}a{color:#454f8a;display:inline-flex;min-height:44px;align-items:center}iframe{display:block;width:100%;max-width:430px;height:844px;border:1px solid #d7d9e5;background:#f8f7f4;margin-top:20px}</style><main><h1>Aura, in a portfolio</h1><p>This page checks the embedded demo. If your browser limits embedded cookies, open Aura directly.</p><a href="${safe}/">Open demo</a><iframe title="Aura interactive mood journal demo" src="${safe}/"></iframe></main></html>`;
const server = createServer((request, response) => {
  if (request.url !== '/') {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': `default-src 'none'; style-src 'unsafe-inline'; frame-src ${childOrigin}; base-uri 'none'; form-action 'none'`,
  });
  response.end(html);
});
const port = Number(process.env.AURA_EMBED_PORT || 3112);
server.listen(port, '127.0.0.1', () =>
  console.log(`Aura embed harness listening on http://127.0.0.1:${port}`),
);
