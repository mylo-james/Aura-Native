import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const queryString = require('query-string') as {
  parse: (query: string) => Record<string, string>;
  stringify: (input: Record<string, string>) => string;
};
test('Expo query-string CommonJS adapter supports the patched URI decoder', () => {
  assert.equal(queryString.parse('title=caf%C3%A9').title, 'café');
  assert.equal(queryString.stringify({title: 'café'}), 'title=caf%C3%A9');
  const start = performance.now();
  assert.equal(
    typeof queryString.parse('title=' + '%EA'.repeat(30000)).title,
    'string',
  );
  assert.ok(
    performance.now() - start < 1000,
    'Malformed URI decoding must remain bounded',
  );
});
