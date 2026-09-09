import test from 'node:test';
import assert from 'node:assert/strict';
import {
  draftReducer,
  freshDraft,
  validateReflection,
} from '../../client/src/features/draft';
test('optional context and Unicode code-point limits agree with the API', () => {
  assert.deepEqual(validateReflection('', ''), {title: '', body: ''});
  assert.equal(validateReflection('🙂'.repeat(50), '🙂'.repeat(2000)).body, '');
  assert.notEqual(validateReflection('🙂'.repeat(51), '').title, '');
  assert.notEqual(validateReflection('', '🙂'.repeat(2001)).body, '');
});
test('draft survives step navigation and retry with stable operation id and multiline content', () => {
  let state = freshDraft('operation');
  state = draftReducer(state, {type: 'mood', value: 3});
  state = draftReducer(state, {type: 'influence', value: 7});
  state = draftReducer(state, {
    type: 'text',
    field: 'body',
    value: 'first\nsecond',
  });
  state = draftReducer(state, {type: 'step', value: 'reflection'});
  state = draftReducer(state, {type: 'step', value: 'mood'});
  assert.equal(state.body, 'first\nsecond');
  assert.equal(state.operationId, 'operation');
  assert.deepEqual(state.influences, [7]);
  state = draftReducer(state, {type: 'influence', value: 7});
  assert.deepEqual(state.influences, []);
});
test('reset drops all former draft fields and operation identity', () => {
  const old = {
    ...freshDraft('old'),
    mood: 5 as const,
    body: 'discard',
    influences: [1],
  };
  assert.deepEqual(
    draftReducer(old, {type: 'reset', operationId: 'new'}),
    freshDraft('new'),
  );
});
