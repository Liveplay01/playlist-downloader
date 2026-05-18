import { chromium, Browser, BrowserContext } from 'playwright';

// Injected before every page load to mask headless/automation signals
const STEALTH_SCRIPT = `
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'plugins', { get: () => [
    { name: 'PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
    { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: '' },
  ]});
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
  Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
  window.chrome = {
    app: { isInstalled: false, InstallState: {}, RunningState: {} },
    runtime: {},
    loadTimes: function() {},
    csi: function() {},
  };
  const _origPermissions = navigator.permissions.query.bind(navigator.permissions);
  navigator.permissions.query = (p) =>
    p.name === 'notifications'
      ? Promise.resolve({ state: Notification.permission, onchange: null })
      : _origPermissions(p);
  Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
`;

class BrowserManager {
  private browser: Browser | null = null;
  private initPromise: Promise<Browser> | null = null;

  async getBrowser(): Promise<Browser> {
    if (this.browser?.isConnected()) return this.browser;
    if (this.initPromise) return this.initPromise;
    this.initPromise = chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-infobars',
        '--window-size=1280,720',
        '--disable-extensions',
      ],
    }).then(b => {
      this.browser = b;
      this.initPromise = null;
      return b;
    });
    return this.initPromise;
  }

  async newContext(userAgent?: string): Promise<BrowserContext> {
    const browser = await this.getBrowser();
    const ctx = await browser.newContext({
      userAgent: userAgent ??
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
      extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
    });
    await ctx.addInitScript(STEALTH_SCRIPT);
    return ctx;
  }

  async close(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
    this.initPromise = null;
  }
}

export const browserManager = new BrowserManager();
