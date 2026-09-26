const { chromium } = require('playwright');

const BROWSER_OPTIONS = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
};

const MP_BHULEKH_HOME_URL = 'https://webgis2.mpbhulekh.gov.in/#/home';

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[।|,]+/g, ' ')
    .replace(/[^a-z0-9\u0900-\u097f/() -]+/g, '')
    .trim();

const clean = (value = '') => String(value).replace(/\s+/g, ' ').trim();

const optionLabel = (value = '') => clean(String(value).replace(/^जिला चुनें$/i, '').replace(/^तहसील चयन करें$/i, '').replace(/^ग्राम \| LGD कोड का चयन करें$/i, ''));

const optionMatch = (options, requestedText) => {
  const requested = normalize(requestedText);
  return (
    options.find((option) => normalize(option) === requested) ||
    options.find((option) => normalize(option).includes(requested)) ||
    options.find((option) => requested.includes(normalize(option)))
  );
};

const openMpLandRecord = async (page) => {
  await page.goto(MP_BHULEKH_HOME_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5500);
  await page.getByText('भू-अभिलेख', { exact: true }).first().click();
  await page.waitForTimeout(2200);
  await page.getByRole('button', { name: 'हाँ' }).first().click();
  await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(4500);
};

const readMatOptions = async (page, selectIndex) => {
  await page.locator('mat-select').nth(selectIndex).click();
  await page.waitForTimeout(1200);
  const options = await page
    .locator('mat-option:not(.mat-mdc-option-disabled)')
    .evaluateAll((items) =>
      items
        .map((item) => (item.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean),
    );
  await page.keyboard.press('Escape').catch(() => {});
  return [...new Set(options.map(optionLabel).filter(Boolean))];
};

const selectMatOption = async (page, selectIndex, requestedText) => {
  const options = await readMatOptions(page, selectIndex);
  const match = optionMatch(options, requestedText);
  if (!match) {
    throw Object.assign(new Error(`${requestedText} was not found in official MP Bhulekh dropdown.`), {
      statusCode: 404,
      details: { requestedText, options: options.slice(0, 80) },
    });
  }

  await page.locator('mat-select').nth(selectIndex).click();
  await page.waitForTimeout(800);
  await page.locator('mat-option:not(.mat-mdc-option-disabled)').filter({ hasText: match }).first().click();
  await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(2500);
  return match;
};

const getMpOptions = async ({ district, tehsil }) => {
  const browser = await chromium.launch(BROWSER_OPTIONS);
  try {
    const page = await browser.newPage({
      locale: 'hi-IN',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    });
    page.setDefaultTimeout(90000);
    await openMpLandRecord(page);

    const result = {
      districts: await readMatOptions(page, 0),
      tehsils: [],
      extraRegions: [],
      villages: [],
      years: ['CURRENT'],
    };

    if (!district) return result;

    await selectMatOption(page, 0, district);
    result.tehsils = await readMatOptions(page, 1);

    if (!tehsil) return result;

    await selectMatOption(page, 1, tehsil);
    result.villages = await readMatOptions(page, 2);
    return result;
  } finally {
    await browser.close();
  }
};

const verifyMpLandRecord = async () => {
  throw Object.assign(
    new Error(
      'MP Bhulekh WebGIS loads official district, tehsil, and village dropdowns, but final record viewing requires the portal captcha. Official dropdowns are loaded; verified record fetch needs a user-assisted captcha step.',
    ),
    { statusCode: 409 },
  );
};

module.exports = { getMpOptions, verifyMpLandRecord, __testing: { normalize, optionLabel, optionMatch } };
