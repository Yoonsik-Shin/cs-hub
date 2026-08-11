const { timingSafeEqual } = require('crypto');

const MIN_TOKEN_LENGTH = 16;
const PLACEHOLDER_TOKENS = new Set(['changeme', 'replace_with_internal_api_token']);

function requireInternalToken(environment = process.env) {
    const token = environment.INTERNAL_API_TOKEN;
    if (!token || token.length < MIN_TOKEN_LENGTH || PLACEHOLDER_TOKENS.has(token)) {
        throw new Error(
            `INTERNAL_API_TOKEN must be configured with at least ${MIN_TOKEN_LENGTH} characters.`
        );
    }
    return token;
}

function matchesInternalToken(candidate, expected) {
    if (typeof candidate !== 'string') {
        return false;
    }
    const candidateBuffer = Buffer.from(candidate);
    const expectedBuffer = Buffer.from(expected);
    return candidateBuffer.length === expectedBuffer.length
        && timingSafeEqual(candidateBuffer, expectedBuffer);
}

module.exports = { matchesInternalToken, requireInternalToken };
