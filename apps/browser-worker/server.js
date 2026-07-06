const express = require('express');
const naverCafe = require('./src/tasks/naverCafe');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const app = express();
const port = process.env.PORT || 3000;
const token = process.env.INTERNAL_API_TOKEN || 'changeme';

// Middleware to parse JSON bodies
app.use(express.json());

// Token Validation Middleware for security
app.use((req, res, next) => {
    const requestToken = req.headers['x-internal-token'];
    if (!requestToken || requestToken !== token) {
        console.warn(`[SERVER] Unauthorized API access request blocked. Token: "${requestToken}"`);
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid internal token' });
    }
    next();
});

/**
 * Endpoint: POST /api/naver/login/one-time
 * Performs Naver Login using an 8-digit one-time code and returns cookies.
 */
app.post('/api/naver/login/one-time', async (req, res) => {
    const { code } = req.body;

    if (!code || code.trim().length !== 8 || isNaN(Number(code))) {
        return res.status(400).json({ success: false, reason: 'Invalid code format. Code must be exactly 8 digits.' });
    }

    try {
        const result = await naverCafe.oneTimeLogin(code.trim());
        if (result.success) {
            return res.json({ success: true, cookies: result.cookies });
        } else {
            return res.status(500).json({ success: false, reason: result.reason });
        }
    } catch (err) {
        console.error('[SERVER] One-time login error:', err);
        return res.status(500).json({ success: false, reason: err.message });
    }
});

/**
 * Endpoint: POST /api/naver/comment
 * Posts a comment or reply to a Naver Cafe article.
 */
app.post('/api/naver/comment', async (req, res) => {
    const { cookiesJson, cafeId, articleId, commentText, parentCommentAuthor, parentCommentText, targetNickname } = req.body;

    if (!cookiesJson || !cafeId || !articleId || !commentText) {
        return res.status(400).json({ success: false, reason: 'Missing required parameters: cookiesJson, cafeId, articleId, commentText.' });
    }

    let cookies;
    try {
        cookies = typeof cookiesJson === 'string' ? JSON.parse(cookiesJson) : cookiesJson;
    } catch (err) {
        return res.status(400).json({ success: false, reason: `Failed to parse cookies JSON: ${err.message}` });
    }

    try {
        const result = await naverCafe.postComment({
            cookies,
            cafeId,
            articleId,
            commentText,
            parentCommentAuthor,
            parentCommentText,
            targetNickname
        });

        if (result.success) {
            return res.json({ success: true, message: 'Comment posted successfully' });
        } else {
            if (result.reason === 'SESSION_EXPIRED') {
                return res.status(401).json({ success: false, reason: 'SESSION_EXPIRED' });
            }
            return res.status(500).json({ success: false, reason: result.reason });
        }
    } catch (err) {
        console.error('[SERVER] Comment post error:', err);
        return res.status(500).json({ success: false, reason: err.message });
    }
});

/**
 * Endpoint: POST /api/naver/session/validate
 * Validates Naver Cafe session cookies.
 */
app.post('/api/naver/session/validate', async (req, res) => {
    const { cookiesJson } = req.body;

    if (!cookiesJson) {
        return res.status(400).json({ success: false, reason: 'Missing required parameter: cookiesJson.' });
    }

    let cookies;
    try {
        cookies = typeof cookiesJson === 'string' ? JSON.parse(cookiesJson) : cookiesJson;
    } catch (err) {
        return res.status(400).json({ success: false, reason: `Failed to parse cookies JSON: ${err.message}` });
    }

    try {
        const result = await naverCafe.validateSession(cookies);
        if (result.success) {
            return res.json({ success: true, valid: result.valid });
        } else {
            return res.status(500).json({ success: false, reason: result.reason });
        }
    } catch (err) {
        console.error('[SERVER] Session validation error:', err);
        return res.status(500).json({ success: false, reason: err.message });
    }
});

app.listen(port, () => {
    console.log(`[SERVER] Browser Worker Server listening on port ${port}`);
});
