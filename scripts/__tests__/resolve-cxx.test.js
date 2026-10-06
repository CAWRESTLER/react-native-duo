const assert = require('node:assert/strict');
const { test } = require('node:test');

const { resolveCxx } = require('../resolve-cxx');

test('resolveCxx returns a compiler that parses native policy headers', () => {
  const cxx = resolveCxx();
  assert.match(cxx, /(?:^|\/)(c\+\+|g\+\+|clang\+\+)$/);
});
