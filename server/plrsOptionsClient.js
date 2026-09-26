const { chromium } = require('playwright');

const BROWSER_OPTIONS = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
};

const PLRS_OWNER_URL = 'https://jamabandi.punjab.gov.in/Jamabandi.aspx?section=Owner-Name-Wise&itemID=7&itemPID=3';

const REGION = {
  district: '#ContentPlaceHolder1_SelectRegionF_ddlDistrict',
  tehsil: '#ContentPlaceHolder1_SelectRegionF_ddlTehsil',
  village: '#ContentPlaceHolder1_SelectRegionF_ddlVillage',
  year: '#ContentPlaceHolder1_SelectRegionF_ddlYear',
};

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/\biii\b/g, '3')
    .replace(/\bii\b/g, '2')
    .replace(/\bi\b/g, '1')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const cleanOptionLabel = (text = '') =>
  String(text)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^.*\//, '')
    .trim();

const readOptions = async (page, selector) => {
  const options = await page.locator(`${selector} option`).evaluateAll((items) =>
    items.map((option) => ({ value: option.value, text: option.textContent || '' })),
  );

  return options
    .filter((option) => option.value && !normalize(option.text).includes('choose'))
    .map((option) => cleanOptionLabel(option.text))
    .filter(Boolean);
};

const selectByLabel = async (page, selector, label) => {
  const requested = normalize(label);
  const options = await page.locator(`${selector} option`).evaluateAll((items) =>
    items.map((option) => ({ value: option.value, text: option.textContent || '' })),
  );
  const match =
    options.find((option) => normalize(cleanOptionLabel(option.text)) === requested) ||
    options.find((option) => normalize(option.text) === requested) ||
    options.find((option) => normalize(option.text).includes(requested)) ||
    options.find((option) => requested.includes(normalize(cleanOptionLabel(option.text))));

  if (!match?.value) {
    throw Object.assign(new Error(`${label} was not found in official PLRS dropdown.`), {
      statusCode: 404,
    });
  }

  await page.selectOption(selector, match.value);
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1000);
};

const waitForOptions = async (page, selector) => {
  await page.waitForFunction(
    (selectSelector) => document.querySelectorAll(`${selectSelector} option`).length > 1,
    selector,
    { timeout: 60000 },
  );
};

const getPunjabOptions = async ({ district, tehsil, village }) => {
  const browser = await chromium.launch(BROWSER_OPTIONS);
  try {
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    });
    page.setDefaultTimeout(90000);
    await page.goto(PLRS_OWNER_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(1500);

    const districts = await readOptions(page, REGION.district);
    const result = { districts, tehsils: [], villages: [], years: [] };

    if (!district) return result;

    await selectByLabel(page, REGION.district, district);
    await waitForOptions(page, REGION.tehsil);
    result.tehsils = await readOptions(page, REGION.tehsil);

    if (!tehsil) return result;

    await selectByLabel(page, REGION.tehsil, tehsil);
    await waitForOptions(page, REGION.village);
    result.villages = await readOptions(page, REGION.village);

    if (!village) return result;

    await selectByLabel(page, REGION.village, village);
    await waitForOptions(page, REGION.year).catch(() => {});
    result.years = await readOptions(page, REGION.year);

    return result;
  } finally {
    await browser.close();
  }
};

module.exports = { getPunjabOptions };
