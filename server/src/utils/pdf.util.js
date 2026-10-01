/**
 * Puppeteer PDF generation — workout plans, meal plans, progress reports,
 * certificates, grocery lists, annual fitness wrap.
 * Renders an HTML string to PDF. Falls back gracefully if Chromium is absent.
 */
const logger = require('./logger.util');

let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    // lazy require so the app can boot without puppeteer installed
    const puppeteer = require('puppeteer');
    browserPromise = puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browserPromise;
}

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Inter, Arial, sans-serif; color: #0f172a; padding: 48px; background: #fff; }
  h1 { font-size: 28px; margin-bottom: 8px; }
  h2 { font-size: 20px; margin: 24px 0 8px; color: #16a34a; }
  .muted { color: #64748b; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  th { text-align: left; background: #f1f5f9; padding: 8px; border-bottom: 2px solid #e2e8f0; }
  td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
  .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 12px 0; }
  .badge { display: inline-block; background: #dcfce7; color: #166534; border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 600; }
  .certificate { text-align: center; border: 12px double #16a34a; padding: 64px 48px; margin-top: 32px; }
  .certificate h1 { font-size: 40px; color: #16a34a; }
  .name { font-size: 32px; font-weight: 700; margin: 24px 0; }
  .footer { margin-top: 48px; font-size: 11px; color: #94a3b8; text-align: center; }
`;

/**
 * @param {string} html body HTML (without <html> wrapper)
 * @param {object} opts { format, landscape, printBackground, footer }
 * @returns {Promise<Buffer>}
 */
async function generatePdf(html, opts = {}) {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(
      `<!doctype html><html><head><style>${BASE_CSS}</style></head><body>${html}
       <div class="footer">${opts.footer || 'Fitness & Workout Platform'}</div></body></html>`,
      { waitUntil: 'networkidle0' },
    );
    const pdf = await page.pdf({
      format: opts.format || 'A4',
      landscape: !!opts.landscape,
      printBackground: true,
    });
    await page.close();
    return pdf;
  } catch (err) {
    logger.error(`Puppeteer PDF failed: ${err.message}`);
    throw err;
  }
}

module.exports = { generatePdf };
