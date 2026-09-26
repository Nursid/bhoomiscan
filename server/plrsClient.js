const { chromium } = require('playwright');

const BROWSER_OPTIONS = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
};

const PLRS_URLS = {
  Khasra: 'https://jamabandi.punjab.gov.in/Jamabandi.aspx?section=Khasra-Number-Wise&itemID=9&itemPID=3',
  Khewat: 'https://jamabandi.punjab.gov.in/Jamabandi.aspx?section=Khewat-Number-Wise&itemID=8&itemPID=3',
  Owner: 'https://jamabandi.punjab.gov.in/Jamabandi.aspx?section=Owner-Name-Wise&itemID=7&itemPID=3',
};

const REGION = {
  district: '#ContentPlaceHolder1_SelectRegionF_ddlDistrict',
  tehsil: '#ContentPlaceHolder1_SelectRegionF_ddlTehsil',
  village: '#ContentPlaceHolder1_SelectRegionF_ddlVillage',
  year: '#ContentPlaceHolder1_SelectRegionF_ddlYear',
  submit: '#ContentPlaceHolder1_SelectRegionF_btnSearch',
};

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/\biii\b/g, '3')
    .replace(/\bii\b/g, '2')
    .replace(/\bi\b/g, '1')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const optionValueByText = async (page, selector, requestedText) => {
  const requested = normalize(requestedText);
  const options = await page.locator(`${selector} option`).evaluateAll((items) =>
    items.map((option) => ({ value: option.value, text: option.textContent || '' })),
  );
  const match =
    options.find((option) => normalize(option.text) === requested) ||
    options.find((option) => normalize(option.text).includes(requested)) ||
    options.find((option) => requested.includes(normalize(option.text)));

  if (!match?.value) {
    throw Object.assign(new Error(`${requestedText} was not found in official PLRS dropdown.`), {
      statusCode: 404,
      details: { requestedText, options: options.slice(0, 50) },
    });
  }

  return match.value;
};

const firstRealOption = async (page, selector) => {
  const options = await page.locator(`${selector} option`).evaluateAll((items) =>
    items.map((option) => ({ value: option.value, text: (option.textContent || '').replace(/\s+/g, ' ').trim() })),
  );
  const match = options.find((option) => option.value && !normalize(option.text).includes('choose'));
  if (!match?.value) {
    throw Object.assign(new Error('No official PLRS option was available.'), { statusCode: 404 });
  }
  return match;
};

const waitForOptions = async (page, selector) => {
  await page.waitForFunction(
    (selectSelector) => document.querySelectorAll(`${selectSelector} option`).length > 1,
    selector,
    { timeout: 60000 },
  );
};

const selectOfficialOption = async (page, selector, label) => {
  const value = await optionValueByText(page, selector, label);
  await page.selectOption(selector, value);
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1200);
};

const selectOfficialOptionOrFirst = async (page, selector, label) => {
  try {
    await selectOfficialOption(page, selector, label);
    return label;
  } catch (error) {
    const fallback = await firstRealOption(page, selector);
    await page.selectOption(selector, fallback.value);
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1200);
    return fallback.text.replace(/^.*\//, '').trim() || fallback.text;
  }
};

const getControls = async (page) =>
  page.locator('input, select, textarea, button').evaluateAll((nodes) =>
    nodes.map((node) => ({
      id: node.id || '',
      name: node.getAttribute('name') || '',
      type: node.getAttribute('type') || '',
      value: node.getAttribute('value') || '',
      text: node.textContent || '',
      tag: node.tagName.toLowerCase(),
    })),
  );

const findControl = async (page, patterns) => {
  const controls = await getControls(page);
  const match = controls.find((control) => {
    const haystack = normalize(`${control.id} ${control.name} ${control.value} ${control.text}`);
    return patterns.some((pattern) => haystack.includes(pattern));
  });
  return match?.id ? `#${match.id}` : '';
};

const fillSearchInput = async (page, searchType, searchValue, ownerName) => {
  if (searchType === 'Owner') {
    const input = await findControl(page, ['owner name', 'txtownername']);
    if (!input) throw Object.assign(new Error('Official PLRS owner-name input was not found.'), { statusCode: 502 });
    await page.fill(input, ownerName);
    return;
  }

  const selector = await findControl(page, [
    searchType === 'Khasra' ? 'ddlkhasranumber' : 'ddlkhewatnumber',
    searchType.toLowerCase(),
  ]);
  if (!selector) {
    throw Object.assign(new Error(`Official PLRS ${searchType} selector was not found.`), { statusCode: 502 });
  }
  const value = await optionValueByText(page, selector, searchValue);
  await page.selectOption(selector, value);
};

const clickSearchButton = async (page, searchType) => {
  const patterns = searchType === 'Owner'
    ? ['owner name proceed', 'view rport owner name proceed', 'proceed', 'view report']
    : ['view report', 'view rport', 'proceed', 'search'];
  const button = await findControl(page, patterns);
  if (!button) throw Object.assign(new Error('Official PLRS search button was not found.'), { statusCode: 502 });
  await page.click(button);
  await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(3000);
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

const findFirstCell = (rows, patterns) => {
  for (const row of rows) {
    for (const cell of row) {
      if (!/[0-9/]/.test(cell)) continue;
      if (patterns.some((pattern) => pattern.test(cell))) return cell;
    }
  }
  return '';
};

const isKeyboardRow = (row) => {
  const text = normalize(row.join(' '));
  return (
    text.includes('backsp') ||
    text.includes('caps lock') ||
    text.includes('space alt ctrl') ||
    text.includes('shift') ||
    row.some((cell) => /^([a-z]\s+)?[\u0A00-\u0A7F]{1,3}$/.test(cell))
  );
};

const parseRecord = (rows, params, sourceUrl) => {
  const meaningfulRows = rows.filter((row) => {
    const text = normalize(row.join(' '));
    if (text.includes('choose district') || text.includes('select the region')) return false;
    if (text.includes('current previous')) return false;
    if (text.includes('owner name') && text.includes('khewat') && text.includes('khasra')) return false;
    if (isKeyboardRow(row)) return false;
    return row.some((cell) => /[0-9/]/.test(cell)) || row.length >= 3;
  });

  if (!meaningfulRows.length) {
    throw Object.assign(new Error('No official PLRS land record was found for the selected search.'), { statusCode: 404 });
  }

  const flat = meaningfulRows.flat();
  const ownerNeedle = normalize(params.ownerName);
  const ownerCell = flat.find((cell) => ownerNeedle && normalize(cell).includes(ownerNeedle));
  const requestedSearch = normalize(params.searchValue);
  const hasRequestedSearch =
    params.searchType === 'Owner' ||
    !requestedSearch ||
    flat.some((cell) => normalize(cell).includes(requestedSearch));

  if (params.searchType === 'Owner' && ownerNeedle && !ownerCell) {
    throw Object.assign(new Error('No official PLRS owner record matched the verified Aadhaar name.'), { statusCode: 404 });
  }

  if (!hasRequestedSearch) {
    throw Object.assign(new Error(`No official PLRS record matched the submitted ${params.searchType} number.`), { statusCode: 404 });
  }

  return {
    registrationNumber: `PLRS-${Date.now().toString(36).toUpperCase()}`,
    ownerName: ownerCell || 'Official PLRS record holder',
    surveyNo: params.searchType === 'Khasra' ? params.searchValue : findFirstCell(meaningfulRows, [/\d+\/\/\d+/]),
    khewatNo: params.searchType === 'Khewat' ? params.searchValue : findFirstCell(meaningfulRows, [/khewat/i]),
    area: findFirstCell(meaningfulRows, [/kanal/i, /marla/i, /acre/i, /hectare/i]),
    estimatedValuation: '',
    subRegistrarOffice: `${params.tehsil} Tehsil`,
    district: params.district,
    state: 'Punjab',
    registrationDate: '',
    village: params.village,
    year: params.year,
    source: 'Punjab Land Records Society Jamabandi',
    sourceUrl,
    officialRows: meaningfulRows.slice(0, 40),
    verifiedBy: 'Hosted PLRS official lookup',
  };
};

const verifyLandRecord = async (params) => {
  const sourceUrl = PLRS_URLS[params.searchType] || PLRS_URLS.Khasra;
  const browser = await chromium.launch(BROWSER_OPTIONS);
  try {
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    });
    page.setDefaultTimeout(90000);
    await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(2500);

    await selectOfficialOption(page, REGION.district, params.district);
    await waitForOptions(page, REGION.tehsil);
    await selectOfficialOption(page, REGION.tehsil, params.tehsil);
    await waitForOptions(page, REGION.village);
    await selectOfficialOption(page, REGION.village, params.village);
    await waitForOptions(page, REGION.year);
    const selectedYear = await selectOfficialOptionOrFirst(page, REGION.year, params.year);
    const selectedParams = { ...params, year: selectedYear };

    await page.click(REGION.submit);
    await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(3000);

    await fillSearchInput(page, selectedParams.searchType, selectedParams.searchValue, selectedParams.ownerName);
    await clickSearchButton(page, selectedParams.searchType);
    return parseRecord(await tableRows(page), selectedParams, page.url());
  } finally {
    await browser.close();
  }
};

module.exports = { verifyLandRecord, __testing: { parseRecord, isKeyboardRow } };
