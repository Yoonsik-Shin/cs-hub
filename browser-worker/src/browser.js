const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

// Register the stealth plugin to bypass bot detection mechanisms
chromium.use(stealth);

// Default User-Agent simulating a mobile iPhone Safari browser (useful for Naver mobile pages)
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

/**
 * Creates and initializes a Playwright browser instance and a new browser context.
 *
 * @param {Object} options Configuration options
 * @param {boolean} [options.headless=true] Whether to run the browser in headless mode
 * @param {string} [options.userAgent] Custom User-Agent header to use
 * @param {Array<Object>} [options.cookies] Cookies to inject into the context
 * @returns {Promise<{browser: import('playwright').Browser, context: import('playwright').BrowserContext}>}
 */
async function createBrowserContext(options = {}) {
    const headless = options.headless !== false; // defaults to true
    const userAgent = options.userAgent || DEFAULT_USER_AGENT;
    const cookies = options.cookies || [];
    const locale = options.locale || 'ko-KR';

    const browser = await chromium.launch({
        headless: headless,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });

    const context = await browser.newContext({ userAgent, locale });

    if (cookies && cookies.length > 0) {
        await context.addCookies(cookies);
    }

    return { browser, context };
}

module.exports = {
    createBrowserContext
};
