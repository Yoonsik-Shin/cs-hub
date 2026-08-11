const { createBrowserContext } = require('../browser');

const isMock = process.env.NODE_ENV === 'test' || process.argv.includes('--mock');

/**
 * Handles Naver One-Time Code Login.
 *
 * @param {string} code 8-digit one-time login code from Naver App
 * @returns {Promise<{success: boolean, cookies?: Array<Object>, reason?: string}>}
 */
async function oneTimeLogin(code) {
    console.log('[TASK] Starting Naver One-Time login.');

    const targetUrl = isMock
        ? 'http://localhost:3003/login' // Local Mock server login url
        : 'https://nid.naver.com/nidlogin.login';

    let browser, context;
    try {
        const result = await createBrowserContext({
            headless: true,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        });
        browser = result.browser;
        context = result.context;

        const page = await context.newPage();
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

        // Force language to Korean if a select box is present
        try {
            const localeSelect = page.locator('select#locale_select, select[name="locale"], select').first();
            if (await localeSelect.count() > 0) {
                console.log('[TASK] Found language selector. Forcing ko_KR locale...');
                await localeSelect.selectOption('ko_KR');
                await page.waitForTimeout(1000);
            }
        } catch (selectErr) {
            console.error('[TASK] Error while forcing Korean language selection:', selectErr);
        }

        if (isMock) {
            // Mock Login page flow
            console.log('[TASK] Mock mode login...');
            await page.click('#btn_submit_login');
            await page.waitForTimeout(1000);
        } else {
            // Real Naver One-Time Login flow
            console.log('[TASK] Navigating to Real Naver login page. Activating One-Time code tab...');

            // Click the One-time login (일회용 번호) tab
            await page.screenshot({ path: '/app/login_page.png' }).catch(err => console.error('Failed login screenshot:', err));
            console.log(`[TASK] Login page loaded. URL: ${page.url()}`);
            const tab = page.locator('#onespace, a#onespace, .menu_wrap a:has-text("일회용")').first();
            await tab.waitFor({ state: 'visible', timeout: 5000 });
            await tab.click();
            await page.waitForTimeout(500);

            // Wait for one-time code input field
            console.log('[TASK] Filling one-time code...');
            const input = page.locator('#disposable, input[name="disposable"], input#disposable').first();
            await input.waitFor({ state: 'visible', timeout: 5000 });
            await input.fill(code);
            await page.waitForTimeout(300);

            // Submit the one-time code form
            console.log('[TASK] Submitting login form...');
            const submitBtn = page.locator('.btn_global, button[type="submit"], input[type="submit"]').first();
            await submitBtn.click();
        }

        // Poll context cookies to verify successful login
        console.log('[TASK] Polling for session cookie (NID_AUT) to confirm login...');
        let isLoggedIn = false;
        let cookies = [];

        for (let i = 0; i < 20; i++) { // Poll for up to 10 seconds
            cookies = await context.cookies();
            const hasAut = cookies.some(c => c.name === 'NID_AUT');
            if (hasAut) {
                isLoggedIn = true;
                break;
            }
            await page.waitForTimeout(500);
        }

        if (!isLoggedIn) {
            console.error('[TASK] Login verification failed. Session cookie not found.');
            await browser.close();
            return { success: false, reason: 'LOGIN_TIMEOUT_OR_INVALID_CODE' };
        }

        console.log('[TASK] Login success! Session cookies retrieved successfully.');
        await browser.close();
        return { success: true, cookies };

    } catch (err) {
        console.error('[TASK] Error during one-time login execution:', err);
        if (browser) await browser.close();
        return { success: false, reason: err.message };
    }
}

/**
 * Posts a comment or reply to a Naver Cafe article.
 *
 * @param {Object} taskData
 * @param {Array<Object>} taskData.cookies Injectable session cookies
 * @param {string} taskData.cafeId Target Cafe ID
 * @param {string} taskData.articleId Target Article ID
 * @param {string} taskData.commentText Comment text content
 * @param {string} [taskData.parentCommentAuthor] Author of the parent comment (if reply)
 * @param {string} [taskData.parentCommentText] Substring of the parent comment content (for identification)
 * @param {string} [taskData.targetNickname] User nickname to mention (if applicable)
 * @returns {Promise<{success: boolean, reason?: string}>}
 */
async function postComment(taskData) {
    const { cookies, cafeId, articleId, commentText, parentCommentAuthor, parentCommentText, targetNickname } = taskData;
    console.log(`[TASK] Posting comment to Cafe: ${cafeId}, Article: ${articleId}`);

    let browser, context;
    try {
        const result = await createBrowserContext({ cookies, headless: true });
        browser = result.browser;
        context = result.context;

        const page = await context.newPage();

        // 1. Navigate to target URL
        const targetUrl = isMock
            ? `http://localhost:3003/ca-fe/web/cafes/${cafeId}/articles/${articleId}`
            : `https://m.cafe.naver.com/ca-fe/web/cafes/${cafeId}/articles/${articleId}/comments`;

        console.log(`[TASK] Navigating to: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

        // 2. Validate Session
        const loginBtn = await page.$('.btn_login');
        const isRedirectedToLogin = page.url().includes('nid.naver.com/nidlogin');
        if (loginBtn || isRedirectedToLogin) {
            console.warn('[TASK] Session is expired or invalid.');
            await browser.close();
            return { success: false, reason: 'SESSION_EXPIRED' };
        }

        // 3. Locate and fill comment input box
        const placeholderSelector = '.CafeCommentWriteInput, .text_input_placeholder';
        const commentInputSelector = isMock
            ? 'textarea.CommentWriter_text_input__test'
            : 'div.text_input_area, div[contenteditable="true"]';

        const submitButtonSelector = isMock
            ? 'button.CommentWriter_btn_register__test'
            : 'button:has-text("등록"), button.variant_secondary';

        if (parentCommentAuthor && parentCommentAuthor.trim() !== '') {
            console.log(`[TASK] Searching for parent comment by: "${parentCommentAuthor}"`);
            
            // Wait for list items to load
            await page.waitForSelector('.comment_item, li, .CommentItem', { timeout: 10000 });
            
            // Locators for comment list items
            const commentLocators = page.locator('.comment_item, li:has(.nick_name), li:has(.nick)');
            const count = await commentLocators.count();
            let targetCommentLocator = null;
            
            for (let i = 0; i < count; i++) {
                const item = commentLocators.nth(i);
                const nicknameText = await item.locator('.nick_name, .nick, .CommentItemNickname').first().textContent().catch(() => '');
                
                if (nicknameText && nicknameText.includes(parentCommentAuthor)) {
                    if (parentCommentText && parentCommentText.trim() !== '') {
                        const contentText = await item.locator('.comment_text, .CommentItemContent, .txt').first().textContent().catch(() => '');
                        if (!contentText.includes(parentCommentText)) {
                            continue;
                        }
                    }
                    targetCommentLocator = item;
                    break;
                }
            }
            
            if (!targetCommentLocator) {
                throw new Error(`Parent comment by "${parentCommentAuthor}" was not found.`);
            }
            
            console.log('[TASK] Clicking "답글" button...');
            const replyButton = targetCommentLocator.locator('button:has-text("답글"), a:has-text("답글"), .btn_reply').first();
            await replyButton.click();
            await page.waitForTimeout(1000); // Animation buffer
        } else {
            // Global comment posting
            if (!isMock) {
                console.log('[TASK] Clicking comment box placeholder...');
                await page.click(placeholderSelector);
                await page.waitForTimeout(1000); // Editor load buffer
            }
        }

        const commentInput = page.locator(commentInputSelector).last();
        const submitBtn = page.locator(submitButtonSelector).last();

        await commentInput.waitFor({ state: 'visible', timeout: 10000 });
        await commentInput.click();

        // 4. Input Text (with Mentions)
        if (targetNickname && targetNickname.trim() !== '' && !isMock) {
            console.log(`[TASK] Mentioning user: "${targetNickname}"`);
            await commentInput.type(' ', { delay: 50 }); // Focus editor state
            
            await page.evaluate(({ name, text }) => {
                const inputs = document.querySelectorAll('div.text_input_area, div[contenteditable="true"], .comment_textarea [contenteditable="true"]');
                const input = inputs[inputs.length - 1];
                if (input) {
                    input.innerHTML = `<span class="reply_to" contenteditable="false">${name}</span>&nbsp;${text}`;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, { name: targetNickname.trim(), text: commentText });
        } else if (targetNickname && targetNickname.trim() !== '' && isMock) {
            const finalCommentText = `@${targetNickname.trim()} ${commentText}`;
            await commentInput.type(finalCommentText, { delay: 50 });
        } else {
            await commentInput.type(commentText, { delay: 50 });
        }

        // 5. Submit and Wait for Network Response
        console.log('[TASK] Submitting comment...');
        if (isMock) {
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
                submitBtn.click()
            ]);
        } else {
            await Promise.all([
                page.waitForResponse(resp => resp.url().includes('comments') && resp.status() === 200, { timeout: 15000 }),
                submitBtn.click()
            ]);
        }

        console.log('[TASK] Comment posted successfully!');
        await browser.close();
        return { success: true };

    } catch (err) {
        console.error('[TASK] Error during comment posting:', err);
        if (browser) await browser.close();
        return { success: false, reason: err.message };
    }
}

/**
 * Validates Naver Cafe session cookies by visiting a Cafe page.
 *
 * @param {Array<Object>} cookies Stored Naver session cookies
 * @returns {Promise<{success: boolean, valid?: boolean, reason?: string}>}
 */
async function validateSession(cookies) {
    console.log('[TASK] Validating Naver Cafe session cookies...');
    const targetUrl = isMock
        ? 'http://localhost:3003/ca-fe/web/cafes/test-cafe/articles/test-article'
        : 'https://nid.naver.com/user2/help/myInfo?menu=home';

    let browser, context;
    try {
        const result = await createBrowserContext({ cookies, headless: true });
        browser = result.browser;
        context = result.context;

        const page = await context.newPage();
        console.log(`[TASK] Navigating to: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.screenshot({ path: '/app/validation_page.png' }).catch(err => console.error('Failed to take screenshot:', err));
        console.log(`[TASK] Current URL is: ${page.url()}`);

        // Check if redirected to login page or if login button is visible
        const loginBtn = await page.$('.btn_login');
        const isRedirectedToLogin = page.url().includes('nid.naver.com/nidlogin');

        if (loginBtn || isRedirectedToLogin) {
            console.log('[TASK] Session is invalid (expired).');
            await browser.close();
            return { success: true, valid: false };
        }

        console.log('[TASK] Session is valid (fresh).');
        await browser.close();
        return { success: true, valid: true };
    } catch (err) {
        console.error('[TASK] Error during session validation:', err);
        if (browser) await browser.close();
        return { success: false, reason: err.message };
    }
}

module.exports = {
    oneTimeLogin,
    postComment,
    validateSession
};
