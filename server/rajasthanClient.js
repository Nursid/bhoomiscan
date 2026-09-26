const { chromium } = require('playwright');

const APNA_KHATA_VILLAGE_URL = 'https://apnakhata.rajasthan.gov.in/Owner_wise/villselAll3.aspx';

const SELECTORS = {
  district: '#ctl00_ContentPlaceHolder1_DDL_Dist',
  tehsil: '#ctl00_ContentPlaceHolder1_DDL_Tehsil',
  village: '#ctl00_ContentPlaceHolder1_lbvillage',
  searchValue: '#ctl00_ContentPlaceHolder1_ddlKhataandKhasra',
};

const TARGETS = {
  village: 'ctl00$ContentPlaceHolder1$lbvillage',
  jamabandi: 'ctl00$ContentPlaceHolder1$Khate_se',
  current: 'ctl00$ContentPlaceHolder1$currentreport',
  khata: 'ctl00$ContentPlaceHolder1$Khata_RB',
  khasra: 'ctl00$ContentPlaceHolder1$Khasra_RB',
};

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[।|,]+/g, ' ')
    .replace(/[^a-z0-9\u0900-\u097f/ -]+/g, '')
    .trim();

const clean = (value = '') => String(value).replace(/\s+/g, ' ').trim();

const readOptions = async (page, selector) => {
  if (!(await page.locator(selector).count())) return [];

  const options = await page.locator(`${selector} option`).evaluateAll((items) =>
    items.map((option) => ({ value: option.value, text: option.textContent || '' })),
  );

  return options
    .filter((option) => option.value && option.value !== '0')
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

  if (!match?.value || match.value === '0') {
    throw Object.assign(new Error(`${requestedText} was not found in official Rajasthan Apna Khata dropdown.`), {
      statusCode: 404,
      details: { requestedText, options: options.slice(0, 60) },
    });
  }

  return match.value;
};

const submitPostback = async (page, target, valueSetter) => {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {}),
    page.evaluate(
      ({ eventTarget, setter }) => {
        if (setter?.id) {
          const element = document.getElementById(setter.id);
          if (element) {
            if (setter.checked) element.checked = true;
            if (setter.value !== undefined) element.value = setter.value;
          }
        }
        document.getElementById('__EVENTTARGET').value = eventTarget;
        document.getElementById('__EVENTARGUMENT').value = '';
        document.getElementById('aspnetForm').submit();
      },
      { eventTarget: target, setter: valueSetter || null },
    ),
  ]);
  await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1200);
};

const selectOptionAndWait = async (page, selector, label) => {
  const value = await optionValueByText(page, selector, label);
  await page.selectOption(selector, value);
  await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1200);
  return value;
};

const selectVillageAndOpenNakal = async (page, village) => {
  const value = await optionValueByText(page, SELECTORS.village, village);
  await submitPostback(page, TARGETS.village, {
    id: 'ctl00_ContentPlaceHolder1_lbvillage',
    value,
  });
};

const openVillageSearch = async (page, params) => {
  await page.goto(APNA_KHATA_VILLAGE_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(1500);
  await selectOptionAndWait(page, SELECTORS.district, params.district);
  await selectOptionAndWait(page, SELECTORS.tehsil, params.tehsil);
  await selectVillageAndOpenNakal(page, params.village);
};

const selectReportMode = async (page, searchType) => {
  await submitPostback(page, TARGETS.jamabandi, {
    id: 'ctl00_ContentPlaceHolder1_Khate_se',
    checked: true,
  });
  await submitPostback(page, TARGETS.current, {
    id: 'ctl00_ContentPlaceHolder1_currentreport',
    checked: true,
  });

  const target = searchType === 'Khata' ? TARGETS.khata : TARGETS.khasra;
  const radioId = searchType === 'Khata' ? 'ctl00_ContentPlaceHolder1_Khata_RB' : 'ctl00_ContentPlaceHolder1_Khasra_RB';
  await submitPostback(page, target, {
    id: radioId,
    checked: true,
  });
};

const selectSearchValue = async (page, searchValue) => {
  const value = await optionValueByText(page, SELECTORS.searchValue, searchValue);
  await submitPostback(page, 'ctl00$ContentPlaceHolder1$ddlKhataandKhasra', {
    id: 'ctl00_ContentPlaceHolder1_ddlKhataandKhasra',
    value,
  });
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

const findRowAfterHeader = (rows, headerNeedle) => {
  const headerIndex = rows.findIndex((row) => normalize(row.join(' ')).includes(normalize(headerNeedle)));
  if (headerIndex === -1) return [];
  return rows.slice(headerIndex + 1).find((row) => row.some((cell) => /\d/.test(cell))) || [];
};

const findOwner = (rows) => {
  const nameHeaderIndex = rows.findIndex((row) => row.length === 1 && normalize(row[0]) === normalize('नाम'));
  if (nameHeaderIndex !== -1) {
    const ownerRow = rows.slice(nameHeaderIndex + 1).find((row) => row.some((cell) => /[\u0900-\u097f]/.test(cell)));
    if (ownerRow?.[0]) return ownerRow[0];
  }

  const ownerMarkerIndex = rows.findIndex((row) => normalize(row.join(' ')).includes(normalize('काश्तकार की सूचना')));
  if (ownerMarkerIndex !== -1) {
    const ownerRow = rows.slice(ownerMarkerIndex + 1).find((row) => row.some((cell) => /[\u0900-\u097f]/.test(cell)));
    if (ownerRow?.[0] && normalize(ownerRow[0]) !== normalize('नाम')) return ownerRow[0];
  }

  return '';
};

const findOwnerInText = (text = '') => {
  const lines = String(text)
    .split(/\r?\n/)
    .map(clean)
    .filter(Boolean);
  const markerIndex = lines.findIndex((line) => normalize(line).includes(normalize('काश्तकार की सूचना')));
  if (markerIndex === -1) return '';

  const ownerLine = lines.slice(markerIndex + 1).find((line) => {
    const normalized = normalize(line);
    if (!normalized || normalized === normalize('नाम')) return false;
    if (normalized.includes(normalize('आवेदन करें'))) return false;
    if (normalized.includes(normalize('जिला :-'))) return false;
    if (normalized.includes(normalize('तहसील :-'))) return false;
    if (normalized.includes(normalize('गाँव:-'))) return false;
    return /[\u0900-\u097f]/.test(line);
  });

  return ownerLine || '';
};

const parseRecord = (rows, params, sourceUrl, bodyText = '') => {
  const khasraRow = findRowAfterHeader(rows, 'खाता संख्या खसरा रकबा');
  const ownerName = findOwnerInText(bodyText) || findOwner(rows) || params.ownerName;

  if (!khasraRow.length || !ownerName) {
    throw Object.assign(new Error('No official Rajasthan Apna Khata land record was found for the selected search.'), {
      statusCode: 404,
    });
  }

  return {
    registrationNumber: `RAJ-${Date.now().toString(36).toUpperCase()}`,
    ownerName,
    surveyNo: khasraRow[1] || (params.searchType === 'Khasra' ? params.searchValue : ''),
    khewatNo: '',
    area: khasraRow[2] || '',
    estimatedValuation: '',
    subRegistrarOffice: `${params.tehsil} Tehsil`,
    district: params.district,
    state: 'Rajasthan',
    registrationDate: '',
    village: params.village,
    year: 'CURRENT',
    source: 'Rajasthan Apna Khata Jamabandi',
    sourceUrl,
    officialRows: rows
      .filter((row) => !normalize(row.join(' ')).includes('function'))
      .filter((row) => row.length > 1 || /[\u0900-\u097f0-9]/.test(row.join(' ')))
      .slice(0, 50),
    verifiedBy: 'Hosted Rajasthan Apna Khata official lookup',
  };
};

const getRajasthanOptions = async ({ district, tehsil }) => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    });
    page.setDefaultTimeout(90000);
    await page.goto(APNA_KHATA_VILLAGE_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(1200);

    const result = {
      districts: await readOptions(page, SELECTORS.district),
      tehsils: [],
      villages: [],
      years: [],
    };

    if (!district) return result;

    await selectOptionAndWait(page, SELECTORS.district, district);
    result.tehsils = await readOptions(page, SELECTORS.tehsil);

    if (!tehsil) return result;

    await selectOptionAndWait(page, SELECTORS.tehsil, tehsil);
    result.villages = await readOptions(page, SELECTORS.village);

    return result;
  } finally {
    await browser.close();
  }
};

const verifyRajasthanLandRecord = async (params) => {
  if (!['Khasra', 'Khata'].includes(params.searchType)) {
    throw Object.assign(new Error('Rajasthan official lookup currently supports Khata or Khasra search.'), {
      statusCode: 400,
    });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    });
    page.setDefaultTimeout(90000);

    await openVillageSearch(page, params);
    await selectReportMode(page, params.searchType);
    await selectSearchValue(page, params.searchValue);

    const rows = await tableRows(page);
    const bodyText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
    return parseRecord(rows, params, page.url(), bodyText);
  } finally {
    await browser.close();
  }
};

module.exports = {
  getRajasthanOptions,
  verifyRajasthanLandRecord,
  __testing: { parseRecord, normalize, findOwnerInText },
};
