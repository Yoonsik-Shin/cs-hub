const express = require('express');
const app = express();
const port = 3003;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory store for registered comments (for verification)
const commentsDb = {};

// Helper to parse cookies from headers
function getCookies(req) {
    const cookies = {};
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const parts = cookie.split('=');
            cookies[parts[0].trim()] = (parts[1] || '').trim();
        });
    }
    return cookies;
}

// 1. Mock Article Page
app.get('/ca-fe/web/cafes/:cafeId/articles/:articleId', (req, res) => {
    const { cafeId, articleId } = req.params;
    const cookies = getCookies(req);
    
    // Validate session cookies
    const isLoggedIn = cookies['NID_AUT'] === 'mock_nid_aut' && cookies['NID_SES'] === 'mock_nid_ses';
    
    if (!isLoggedIn) {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Mock Naver Cafe - Login Required</title>
            </head>
            <body>
                <div style="padding: 20px; text-align: center;">
                    <h2>네이버 로그인이 필요합니다.</h2>
                    <a href="/login?redirect=${encodeURIComponent(req.originalUrl)}" class="btn_login" style="padding: 10px 20px; background: #03cf5d; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">네이버 로그인</a>
                </div>
            </body>
            </html>
        `);
        return;
    }

    const key = `${cafeId}-${articleId}`;
    const commentsList = commentsDb[key] || [];

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Mock Cafe Article ${articleId}</title>
            <style>
                body { font-family: sans-serif; padding: 20px; background-color: #f5f6f8; }
                .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
                .comment-box { margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
                textarea { width: 100%; height: 80px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
                button { background: #03cf5d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 10px; }
                .comment-item { padding: 10px; border-bottom: 1px solid #eee; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>Mock Cafe Article - ${articleId} (Cafe: ${cafeId})</h1>
                <p>이것은 로컬 테스트용 모의 네이버 카페 게시글 본문입니다.</p>
            </div>
            
            <div class="card comment-box">
                <h3>댓글 목록</h3>
                <div id="comments-container">
                    ${commentsList.map(c => `<div class="comment-item"><strong>매니저:</strong> ${c}</div>`).join('')}
                </div>
                
                <hr>
                
                <h3>댓글 쓰기</h3>
                <form action="/ca-fe/web/cafes/${cafeId}/articles/${articleId}/comments" method="POST">
                    <textarea name="commentText" class="CommentWriter_text_input__test" placeholder="댓글을 입력하세요"></textarea>
                    <br>
                    <button type="submit" class="CommentWriter_btn_register__test">등록</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

// 2. Mock Comment Submission API
app.post('/ca-fe/web/cafes/:cafeId/articles/:articleId/comments', (req, res) => {
    const { cafeId, articleId } = req.params;
    const commentText = req.body.commentText;
    const cookies = getCookies(req);

    // Validate cookies again
    const isLoggedIn = cookies['NID_AUT'] === 'mock_nid_aut' && cookies['NID_SES'] === 'mock_nid_ses';
    if (!isLoggedIn) {
        return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    if (!commentText || commentText.trim() === '') {
        return res.status(400).json({ error: 'BAD_REQUEST' });
    }

    const key = `${cafeId}-${articleId}`;
    if (!commentsDb[key]) {
        commentsDb[key] = [];
    }
    commentsDb[key].push(commentText);

    console.log(`[MOCK NAVER CAFE] Comment added on Article ${articleId}: "${commentText}"`);

    // Handle AJAX response or Form submit
    if (req.headers['accept'] && req.headers['accept'].includes('json')) {
        return res.json({ status: 'SUCCESS', comment: commentText });
    } else {
        return res.redirect(`/ca-fe/web/cafes/${cafeId}/articles/${articleId}`);
    }
});

// 3. Mock Login Page
app.get('/login', (req, res) => {
    const redirectUrl = req.query.redirect || '/';
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Mock Naver Login</title>
            <style>
                body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f5f6f8; }
                .login-box { background: white; padding: 40px; border-radius: 8px; border: 1px solid #dadada; width: 300px; text-align: center; }
                input { width: 100%; padding: 10px; margin: 10px 0; box-sizing: border-box; border: 1px solid #ccc; }
                button { width: 100%; padding: 12px; background: #03cf5d; color: white; border: none; font-size: 16px; font-weight: bold; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="login-box">
                <h2>NAVER</h2>
                <form action="/login" method="POST">
                    <input type="hidden" name="redirect" value="${redirectUrl}">
                    <input type="text" placeholder="아이디" value="naver_admin">
                    <input type="password" placeholder="비밀번호" value="password">
                    <button type="submit" id="btn_submit_login">로그인</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

// Post Login action: sets cookies and redirects
app.post('/login', (req, res) => {
    const redirectUrl = req.body.redirect || '/';
    res.cookie('NID_AUT', 'mock_nid_aut', { httpOnly: true });
    res.cookie('NID_SES', 'mock_nid_ses', { httpOnly: true });
    
    // Send cookies in header so redirect works
    res.setHeader('Set-Cookie', [
        'NID_AUT=mock_nid_aut; Path=/; HttpOnly',
        'NID_SES=mock_nid_ses; Path=/'
    ]);
    res.redirect(redirectUrl);
});

// API for checking comment database (for verification script)
app.get('/api/comments/:cafeId/:articleId', (req, res) => {
    const { cafeId, articleId } = req.params;
    const key = `${cafeId}-${articleId}`;
    res.json(commentsDb[key] || []);
});

app.listen(port, () => {
    console.log(`[MOCK NAVER SERVER] Running at http://localhost:${port}`);
});
