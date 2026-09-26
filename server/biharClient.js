const { chromium } = require('playwright');

const BROWSER_OPTIONS = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
};

const BIHAR_JAMABANDI_URL = 'https://emutation.bihar.gov.in/BiharBhumiReport/ViewJamabandi';

const SELECTORS = {
  district: '#MainContent_ddlDistrict',
  circle: '#MainContent_ddlCircle',
  halka: '#MainContent_ddlHalka',
  mauza: '#MainContent_ddlMauja',
  proceed: '#MainContent_btnproceed',
  captchaQuestion: '#MainContent_TextBox1',
  captchaAnswer: '#MainContent_TextBox2',
  search: '#MainContent_btnSearch',
};

const SEARCH_FIELDS = {
  Owner: { radio: '#MainContent_rdo_Rayat', input: '#MainContent_txt_Rayat' },
  Plot: { radio: '#MainContent_rdo_PlotNo', input: '#MainContent_txt_PlotNo' },
  Khata: { radio: '#MainContent_rdo_KhataNo', input: '#MainContent_txt_KhataNo' },
  Jamabandi: { radio: '#MainContent_rdo_JamabandiNo', input: '#MainContent_txt_JamabandiNo' },
};

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[।|,]+/g, ' ')
    .replace(/[^a-z0-9\u0900-\u097f/(). -]+/g, '')
    .trim();

const clean = (value = '') => String(value).replace(/\s+/g, ' ').trim();

const readOptions = async (page, selector) => {
  const options = await page.locator(`${selector} option`).evaluateAll((items) =>
    items.map((option) => ({ value: option.value, text: option.textContent || '' })),
  );

  return options
    .filter((option) => option.value && option.value !== '0' && !/^---/.test(clean(option.text)))
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
    options.find((option) => requested.includes(normalize(option.text))) ||
    options.find((option) => requested.includes(normalize(option.value)));

  if (!match?.value || match.value === '0') {
    throw Object.assign(new Error(`${requestedText} was not found in official Bihar Bhumi dropdown.`), {
      statusCode: 404,
      details: { requestedText, options: options.slice(0, 80) },
    });
  }

  return match.value;
};

const waitAfterSelect = async (page) => {
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1200);
};

const openBiharPage = async (page) => {
  await page.goto(BIHAR_JAMABANDI_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(1200);
};

const selectDistrictCircle = async (page, params) => {
  if (params.district) {
    await page.selectOption(SELECTORS.district, await optionValueByText(page, SELECTORS.district, params.district));
    await waitAfterSelect(page);
  }

  if (params.tehsil) {
    await page.selectOption(SELECTORS.circle, await optionValueByText(page, SELECTORS.circle, params.tehsil));
    await waitAfterSelect(page);
    await page.click(SELECTORS.proceed);
    await waitAfterSelect(page);
  }
};

const selectHalkaMauza = async (page, params) => {
  if (params.extraRegion) {
    await page.selectOption(SELECTORS.halka, await optionValueByText(page, SELECTORS.halka, params.extraRegion));
    await waitAfterSelect(page);
  }

  if (params.village) {
    await page.selectOption(SELECTORS.mauza, await optionValueByText(page, SELECTORS.mauza, params.village));
    await waitAfterSelect(page);
  }
};

const solveCaptcha = (question = '') => {
  const match = String(question).match(/(\d+)\s*([+\-xX*])\s*(\d+)/);
  if (!match) return '';
  const left = Number(match[1]);
  const right = Number(match[3]);
  if (match[2] === '-') return String(left - right);
  if (match[2] === '*' || match[2].toLowerCase() === 'x') return String(left * right);
  return String(left + right);
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

const parseRecord = (rows, params, sourceUrl) => {
  const usefulRows = rows.filter((row) => {
    const text = normalize(row.join(' '));
    if (!text || text.includes('चयन करे') || text.includes('सुरक्षा कोड')) return false;
    return row.some((cell) => /[\u0900-\u097f0-9]/.test(cell));
  });

  const ownerRow =
    usefulRows.find((row) => normalize(row.join(' ')).includes(normalize(params.ownerName))) ||
    usefulRows.find((row) => row.some((cell) => /रैयत|नाम/.test(cell)));

  if (!usefulRows.length || !ownerRow) {
    throw Object.assign(new Error('No official Bihar Bhumi Jamabandi record was found for the selected search.'), {
      statusCode: 404,
    });
  }

  return {
    registrationNumber: `BIH-${Date.now().toString(36).toUpperCase()}`,
    ownerName: params.ownerName,
    surveyNo: params.searchType === 'Plot' ? params.searchValue : '',
    khewatNo: params.searchType === 'Khata' ? params.searchValue : '',
    area: '',
    estimatedValuation: '',
    subRegistrarOffice: `${params.tehsil} Circle`,
    district: params.district,
    state: 'Bihar',
    registrationDate: '',
    village: params.village,
    year: 'CURRENT',
    source: 'Bihar Bhumi Jamabandi',
    sourceUrl,
    officialRows: usefulRows.slice(0, 60),
    verifiedBy: 'Hosted Bihar Bhumi official lookup',
  };
};

const getBiharOptions = async ({ district, tehsil, extraRegion }) => {
  const browser = await chromium.launch(BROWSER_OPTIONS);
  try {
    const page = await browser.newPage({
      locale: 'hi-IN',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    });
    page.setDefaultTimeout(90000);
    await openBiharPage(page);

    const result = {
      districts: await readOptions(page, SELECTORS.district),
      tehsils: [],
      extraRegions: [],
      villages: [],
      years: ['CURRENT'],
    };

    if (!district) return result;

    await selectDistrictCircle(page, { district });
    result.tehsils = await readOptions(page, SELECTORS.circle);
    if (!tehsil) return result;

    await selectDistrictCircle(page, { tehsil });
    result.extraRegions = await readOptions(page, SELECTORS.halka);
    if (!extraRegion) return result;

    await selectHalkaMauza(page, { extraRegion });
    result.villages = await readOptions(page, SELECTORS.mauza);
    return result;
  } finally {
    await browser.close();
  }
};

const verifyBiharLandRecord = async (params) => {
  const field = SEARCH_FIELDS[params.searchType];
  if (!field) {
    throw Object.assign(new Error('Bihar official lookup supports Owner, Plot, Khata, or Jamabandi search.'), {
      statusCode: 400,
    });
  }

  const browser = await chromium.launch(BROWSER_OPTIONS);
  try {
    const page = await browser.newPage({
      locale: 'hi-IN',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    });
    page.setDefaultTimeout(90000);
    await openBiharPage(page);
    await selectDistrictCircle(page, params);
    await selectHalkaMauza(page, params);

    await page.check(field.radio);
    await page.fill(field.input, params.searchType === 'Owner' ? params.ownerName : params.searchValue);
    const captcha = solveCaptcha(await page.locator(SELECTORS.captchaQuestion).inputValue().catch(() => ''));
    if (!captcha) {
      throw Object.assign(new Error('Bihar Bhumi captcha could not be read from the official page.'), { statusCode: 409 });
    }
    await page.fill(SELECTORS.captchaAnswer, captcha);
    await page.click(SELECTORS.search);
    await waitAfterSelect(page);

    return parseRecord(await tableRows(page), params, page.url());
  } finally {
    await browser.close();
  }
};

module.exports = { getBiharOptions, verifyBiharLandRecord, __testing: { solveCaptcha, parseRecord, normalize } };
