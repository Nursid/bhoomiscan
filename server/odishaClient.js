const { chromium } = require('playwright');

const BROWSER_OPTIONS = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
};

const ODISHA_BHULEKH_URL = 'https://bhulekh.ori.nic.in/';

const SELECTORS = {
  district: '#ctl00_ContentPlaceHolder1_ddlDistrict',
  tehsil: '#ctl00_ContentPlaceHolder1_ddlTahsil',
  village: '#ctl00_ContentPlaceHolder1_ddlVillage',
  ri: '#ctl00_ContentPlaceHolder1_ddlRI',
  searchValue: '#ctl00_ContentPlaceHolder1_ddlBindData',
  viewRor: '#ctl00_ContentPlaceHolder1_btnRORFront',
};

const SEARCH_RADIOS = {
  Khatiyan: '#ctl00_ContentPlaceHolder1_rbtnRORSearchtype_0',
  Plot: '#ctl00_ContentPlaceHolder1_rbtnRORSearchtype_1',
  Tenant: '#ctl00_ContentPlaceHolder1_rbtnRORSearchtype_2',
};

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\u0b00-\u0b7f/(). -]+/g, '')
    .trim();

const clean = (value = '') => String(value).replace(/\s+/g, ' ').trim();

const readOptions = async (page, selector) => {
  if (!(await page.locator(selector).count())) return [];

  const options = await page.locator(`${selector} option`).evaluateAll((items) =>
    items.map((option) => ({ value: option.value, text: option.textContent || '' })),
  );

  return options
    .filter((option) => option.value && !normalize(option.text).startsWith('select '))
    .map((option) => clean(option.text))
    .filter(Boolean);
};

const optionValueByText = async (page, selector, requestedText) => {
  const requested = normalize(requestedText);
  const options = await page.locator(`${selector} option`).evaluateAll((items) =>
    items.map((option) => ({ value: option.value, text: option.textContent || '' })),
  );
  const match =
    options.find((option) => normalize(option.text) === requested) ||
    options.find((option) => normalize(option.text).includes(requested)) ||
    options.find((option) => requested.includes(normalize(option.text)));

  if (!match?.value || normalize(match.text).startsWith('select ')) {
    throw Object.assign(new Error(`${requestedText} was not found in official Odisha Bhulekh dropdown.`), {
      statusCode: 404,
      details: { requestedText, options: options.slice(0, 80) },
    });
  }

  return match.value;
};

const selectOptionAndWait = async (page, selector, label) => {
  const value = await optionValueByText(page, selector, label);
  await page.selectOption(selector, value);
  await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1600);
  return value;
};

const openOdishaPage = async (page) => {
  await page.goto(ODISHA_BHULEKH_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(1500);
  if (page.url().includes('BhulekhError')) {
    await page.goto(ODISHA_BHULEKH_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(1500);
  }
};

const selectSearchType = async (page, searchType) => {
  const radio = SEARCH_RADIOS[searchType];
  if (!radio) {
    throw Object.assign(new Error('Odisha Bhulekh supports Khatiyan, Plot, or Tenant search.'), { statusCode: 400 });
  }
  await page.check(radio);
  await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1200);
};

const tableRows = async (page) =>
  page.locator('table').evaluateAll((tables) =>
    tables.flatMap((table) =>
      Array.from(table.querySelectorAll('tr'))
        .map((row) =>
          Array.from(row.querySelectorAll('th,td'))
            .map((cell) => (cell.textContent || '').replace(/\s+/g, ' ').trim())
            .filter(Boolean),
        )
        .filter((cells) => cells.length > 1),
    ),
  );

const findAfterNeedle = (text, needle) => {
  const lines = String(text)
    .split(/\r?\n/)
    .map(clean)
    .filter(Boolean);
  const index = lines.findIndex((line) => normalize(line).includes(normalize(needle)));
  if (index === -1) return '';
  return lines.slice(index + 1).find((line) => /[\u0b00-\u0b7fA-Za-z0-9]/.test(line)) || '';
};

const findPlotRow = (rows) =>
  rows.find((row) => {
    const text = row.join(' ');
    const first = clean(row[0] || '');
    return (
      /^\d+(?:\s|\/|-|$)/.test(first) &&
      !/^\d+\)/.test(first) &&
      /[\u0b00-\u0b7f]/.test(text) &&
      row.length >= 4 &&
      !normalize(text).includes(normalize('ଖତିୟାନର କ୍ରମିକ'))
    );
  }) || [];

const findRowValue = (rows, needle) => {
  const exactRow =
    rows.find((item) => clean(item[0] || '').length < 120 && normalize(item[0] || '').includes(normalize(needle)) && item.slice(1).some((cell) => /^\d+(?:\/\d+)?$/.test(clean(cell)))) ||
    rows.find((item) => clean(item[0] || '').length < 120 && normalize(item[0] || '').includes(normalize(needle)) && item.length <= 4);
  const row = exactRow || rows.find((item) => normalize(item.join(' ')).includes(normalize(needle)));
  if (!row) return '';
  return row.slice(1).find((cell) => clean(cell) && !normalize(cell).includes(normalize(needle))) || '';
};

const parseRecord = (rows, params, sourceUrl, bodyText = '') => {
  const ownerName = findAfterNeedle(bodyText, 'ପ୍ରଜାର ନାମ') || params.ownerName;
  const khatiyanNo = findRowValue(rows, 'ଖତିୟାନର କ୍ରମିକ ନମ୍ବର') || (params.searchType === 'Khatiyan' ? params.searchValue : '');
  const plotRow = findPlotRow(rows);

  if (!ownerName || (!plotRow.length && !khatiyanNo)) {
    throw Object.assign(new Error('No official Odisha Bhulekh RoR record was found for the selected search.'), {
      statusCode: 404,
    });
  }

  const areaCells = plotRow.filter((cell) => /^\d+(?:\.\d+)?$/.test(cell));
  const surveyNo = params.searchType === 'Plot' ? params.searchValue : clean(plotRow[0] || '').split(' ')[0] || '';

  return {
    registrationNumber: `ODI-${Date.now().toString(36).toUpperCase()}`,
    ownerName,
    surveyNo,
    khewatNo: khatiyanNo,
    area: areaCells.length ? areaCells.slice(-3).join(' / ') : '',
    estimatedValuation: '',
    subRegistrarOffice: `${params.tehsil} Tahasil`,
    district: params.district,
    state: 'Odisha',
    registrationDate: '',
    village: params.village,
    year: 'CURRENT',
    source: 'Odisha Bhulekh RoR',
    sourceUrl,
    officialRows: rows
      .filter((row) => !normalize(row.join(' ')).includes('javascript'))
      .filter((row) => row.some((cell) => /[\u0b00-\u0b7f0-9]/.test(cell)))
      .slice(0, 60),
    verifiedBy: 'Hosted Odisha Bhulekh official lookup',
  };
};

const getOdishaOptions = async ({ district, tehsil }) => {
  const browser = await chromium.launch(BROWSER_OPTIONS);
  try {
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    });
    page.setDefaultTimeout(90000);
    await openOdishaPage(page);

    const result = {
      districts: await readOptions(page, SELECTORS.district),
      tehsils: [],
      extraRegions: [],
      villages: [],
      years: [],
    };

    if (!district) return result;

    await selectOptionAndWait(page, SELECTORS.district, district);
    result.tehsils = await readOptions(page, SELECTORS.tehsil);

    if (!tehsil) return result;

    await selectOptionAndWait(page, SELECTORS.tehsil, tehsil);
    result.extraRegions = await readOptions(page, SELECTORS.ri);
    result.villages = await readOptions(page, SELECTORS.village);

    return result;
  } finally {
    await browser.close();
  }
};

const verifyOdishaLandRecord = async (params) => {
  if (!['Khatiyan', 'Plot', 'Tenant'].includes(params.searchType)) {
    throw Object.assign(new Error('Odisha Bhulekh supports Khatiyan, Plot, or Tenant search.'), { statusCode: 400 });
  }

  const browser = await chromium.launch(BROWSER_OPTIONS);
  try {
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    });
    page.setDefaultTimeout(90000);
    await openOdishaPage(page);

    await selectOptionAndWait(page, SELECTORS.district, params.district);
    await selectOptionAndWait(page, SELECTORS.tehsil, params.tehsil);
    if (params.extraRegion) {
      const riEnabled = await page.locator(SELECTORS.ri).isEnabled().catch(() => false);
      if (riEnabled) {
        await selectOptionAndWait(page, SELECTORS.ri, params.extraRegion);
      }
    }
    await selectOptionAndWait(page, SELECTORS.village, params.village);
    await selectSearchType(page, params.searchType);
    await selectOptionAndWait(page, SELECTORS.searchValue, params.searchValue);

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {}),
      page.click(SELECTORS.viewRor),
    ]);
    await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(2500);

    const rows = await tableRows(page);
    const bodyText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
    return parseRecord(rows, params, page.url(), bodyText);
  } finally {
    await browser.close();
  }
};

module.exports = { getOdishaOptions, verifyOdishaLandRecord, __testing: { parseRecord } };
