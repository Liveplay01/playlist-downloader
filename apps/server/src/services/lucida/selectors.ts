// All lucida.to DOM selectors in one place for easy updates
export const S = {
  // Search form
  searchInput: 'input[type="search"], input[type="text"], input[placeholder*="earch"], input[placeholder*="rack"], input[name="q"]',
  searchButton: 'button[type="submit"]',

  // Result rows to click when download options aren't directly visible
  resultRow: 'table tr:not(:first-child), .result-row, .track-row, [class*="result"]:not(input):not(button), [class*="track-item"]',

  // Download trigger (used as last-resort fallback)
  downloadLink: 'a[download], a[href*="download"], a[href*="/dl/"], a[href*="/get/"]',
  downloadButton: 'button:has-text("Download"), a:has-text("Download"), button:has-text("FLAC"), a:has-text("FLAC")',

  // Status indicators
  captchaFrame: 'iframe[src*="hcaptcha"], iframe[src*="recaptcha"], iframe[src*="turnstile"]',
  errorMessage: '.error, [role="alert"], .alert-danger, [class*="error"]',
  loadingSpinner: '.loading, .spinner, [data-loading="true"]',
};

// Quality priority order for source selection (highest first)
export const QUALITY_LABELS = ['flac', 'lossless', 'alac', 'wav', 'hi-res', '320', '256', '128'];
