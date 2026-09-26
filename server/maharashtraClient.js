const { chromium } = require('playwright');

const BROWSER_OPTIONS = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
};

const MAHARASHTRA_MASTER_URL = 'https://mahavillages.mahabhumi.gov.in/all_list.php';

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[।|,]+/g, ' ')
    .replace(/[^a-z0-9\u0900-\u097f/(). -]+/g, '')
    .trim();

const clean = (value = '') => String(value).replace(/\s+/g, ' ').trim();

const unique = (values) => [...new Set(values.map(clean).filter(Boolean))];

const formatMasterLabel = ({ code, englishName, localName }) =>
  clean([englishName, localName && localName !== englishName ? `| ${localName}` : '', code ? `(${code})` : ''].filter(Boolean).join(' '));

const readOptions = async (page, selector) => {
  const options = await page.locator(`${selector} option`).evaluateAll((items) =>
    items.map((option) => ({ value: option.value, text: option.textContent || '' })),
  );

  return options
    .filter((option) => option.value)
    .map((option) => clean(option.text))
    .filter((option) => option && !/^-\s*-\s*-/.test(option));
};

const optionValueByText = async (page, selector, requestedText) => {
  const requested = normalize(requestedText);
  const options = await page.locator(`${selector} option`).evaluateAll((items) =>
    items.map((option) => ({ value: option.value, text: option.textContent || '' })),
  );
  const match =
    options.find((option) => normalize(option.text) === requested) ||
    options.find((option) => normalize(option.text).includes(requested)) ||
    options.find((option) => requested.includes(normalize(option.text))) ||
    options.find((option) => requested.includes(normalize(option.value)));

  if (!match?.value) {
    throw Object.assign(new Error(`${requestedText} was not found in official Maharashtra village-master dropdown.`), {
      statusCode: 404,
      details: { requestedText, options: options.slice(0, 80) },
    });
  }

  return match.value;
};

const selectPageLength = async (page) => {
  const lengthSelect = page.locator('select[name="myTable_length"]');
  if (await lengthSelect.count()) {
    await lengthSelect.selectOption('100').catch(() => {});
    await page.waitForTimeout(800);
  }
};

const readVisibleRows = async (page) =>
  page
    .locator('#myTable tbody tr')
    .evaluateAll((rows) =>
      rows
        .map((row) => Array.from(row.querySelectorAll('td')).map((cell) => (cell.textContent || '').replace(/\s+/g, ' ').trim()))
        .filter((cells) => cells.length > 2 && !cells.join(' ').includes('No data')),
    )
    .catch(() => []);

const readAllTableRows = async (page) => {
  await selectPageLength(page);
  const rows = [];
  const seen = new Set();

  for (let index = 0; index < 80; index += 1) {
    for (const row of await readVisibleRows(page)) {
      const key = row.join('|');
      if (!seen.has(key)) {
        seen.add(key);
        rows.push(row);
      }
    }

    const next = page.locator('#myTable_next:not(.disabled), a.paginate_button.next:not(.disabled)').first();
    if (!(await next.count())) break;
    await next.click();
    await page.waitForTimeout(600);
  }

  return rows;
};

const masterRowsToLabels = (rows) =>
  unique(
    rows.map((row) =>
      formatMasterLabel({
        code: row[1],
        englishName: row[2],
        localName: row[3],
      }),
    ),
  );

const openMaster = async (page) => {
  await page.goto(MAHARASHTRA_MASTER_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(1500);
};

const getMaharashtraOptions = async ({ district, tehsil }) => {
  const browser = await chromium.launch(BROWSER_OPTIONS);
  try {
    const page = await browser.newPage({
      locale: 'en-IN',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    });
    page.setDefaultTimeout(90000);
    await openMaster(page);

    const result = {
      districts: await readOptions(page, '#lgdDistrict'),
      tehsils: [],
      extraRegions: [],
      villages: [],
      years: ['CURRENT'],
    };

    if (!district) return result;

    await page.selectOption('#lgdlocalbody', 'T');
    const districtValue = await optionValueByText(page, '#lgdDistrict', district);
    await page.selectOption('#lgdDistrict', districtValue);
    await page.click('#formbtnSearch');
    await page.getByText('Talukas of', { exact: false }).first().waitFor({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);
    result.tehsils = masterRowsToLabels(await readAllTableRows(page));

    if (!tehsil) return result;

    await openMaster(page);
    await page.selectOption('#lgdlocalbody', 'V');
    await page.selectOption('#lgdDistrict', districtValue);
    await page.waitForTimeout(1500);
    const tehsilValue = await optionValueByText(page, '#lgdTaluka', tehsil);
    await page.selectOption('#lgdTaluka', tehsilValue);
    await page.click('#formbtnSearch');
    await page.getByText('Villages of', { exact: false }).first().waitFor({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);
    result.villages = masterRowsToLabels(await readAllTableRows(page));

    return result;
  } finally {
    await browser.close();
  }
};

const verifyMaharashtraLandRecord = async () => {
  throw Object.assign(
    new Error(
      'Maharashtra official village master dropdowns are loaded from Mahavillages. Final 7/12 or property-card extraction requires the Mahabhumi signed/public record flow, so record verification needs the hosted portal step.',
    ),
    { statusCode: 409 },
  );
};

module.exports = {
  getMaharashtraOptions,
  verifyMaharashtraLandRecord,
  __testing: { formatMasterLabel, masterRowsToLabels, normalize },
};
