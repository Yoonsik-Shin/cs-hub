const assert = require('node:assert/strict');
const test = require('node:test');
const {
    matchesInternalToken,
    requireInternalToken,
} = require('../src/security/internalToken');

test('rejects a missing internal token', () => {
    assert.throws(
        () => requireInternalToken({}),
        /INTERNAL_API_TOKEN must be configured/
    );
});

test('rejects placeholder and short internal tokens', () => {
    assert.throws(() => requireInternalToken({ INTERNAL_API_TOKEN: 'changeme' }));
    assert.throws(() => requireInternalToken({ INTERNAL_API_TOKEN: 'short-token' }));
});

test('returns a sufficiently long configured token', () => {
    const token = 'local-development-token-1234';
    assert.equal(requireInternalToken({ INTERNAL_API_TOKEN: token }), token);
});

test('accepts only the exact token', () => {
    const expected = 'local-development-token-1234';
    assert.equal(matchesInternalToken(expected, expected), true);
    assert.equal(matchesInternalToken('local-development-token-1235', expected), false);
    assert.equal(matchesInternalToken('short', expected), false);
    assert.equal(matchesInternalToken(undefined, expected), false);
});
