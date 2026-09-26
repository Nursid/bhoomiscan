const { chromium } = require('playwright');

const BROWSER_OPTIONS = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
};

const UP_BHULEKH_HOME_URL = 'https://upbhulekh.gov.in/#/home';

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[।|,]+/g, ' ')
    .replace(/[^a-z0-9\u0900-\u097f/() -]+/g, '')
    .trim();

const clean = (value = '') => String(value).replace(/\s+/g, ' ').trim();

const unique = (values) => [...new Set(values.map(clean).filter(Boolean))];

const sectionLines = (bodyText, startNeedle, endNeedles = []) => {
  const lines = String(bodyText)
    .split(/\r?\n/)
    .map(clean)
    .filter(Boolean);
  const startIndex = lines.findIndex((line) => normalize(line).includes(normalize(startNeedle)));
  if (startIndex === -1) return [];

  const endIndex = lines.findIndex(
    (line, index) => index > startIndex && endNeedles.some((needle) => normalize(line).includes(normalize(needle))),
  );
  const section = lines.slice(startIndex + 1, endIndex === -1 ? undefined : endIndex);
  return unique(section.filter((line) => /\([\u0900-\u097f]/.test(line) || /-\d+/.test(line)));
};

const readCellsUnderHeading = async (page, headingText) => {
  const cells = await page.evaluate((heading) => {
    const cleanText = (value = '') => String(value).replace(/\s+/g, ' ').trim();
    const normalizeText = (value = '') =>
      String(value)
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[।|,]+/g, ' ')
        .replace(/[^a-z0-9\u0900-\u097f/() -]+/g, '')
        .trim();

    const requested = normalizeText(heading);
    const headingNode = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).find((node) =>
      normalizeText(node.textContent || '').includes(requested),
    );
    if (!headingNode) return [];

    const section =
      headingNode.closest('.border') ||
      headingNode.closest('.card') ||
      headingNode.closest('.col-12') ||
      headingNode.closest('section') ||
      headingNode.parentElement;
    if (!section) return [];

    return Array.from(section.querySelectorAll('td, button, a'))
      .map((node) => cleanText(node.textContent || ''))
      .filter(Boolean);
  }, headingText);

  return unique(cells.filter((cell) => /\([\u0900-\u097f]/.test(cell) || /-\d+/.test(cell) || /वर्तमान|^\d{4}/.test(cell)));
};

const levenshtein = (a, b) => {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[a.length][b.length];
};

const fuzzyMatchScore = (str1, str2) => {
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  const dist = levenshtein(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
};

const clickExactText = async (page, text, preferLast = false) => {
  let matches = page.getByText(text, { exact: true });
  if (!(await matches.count())) {
    matches = page.getByText(text, { exact: false });
  }

  if (!(await matches.count())) {
    const parts = text.split(/[\(\)]+/).map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      const partMatches = page.getByText(part, { exact: false });
      if (await partMatches.count()) {
        matches = partMatches;
        break;
      }
    }
  }

  const target = preferLast ? matches.last() : matches.first();
  if (!(await target.count())) {
    throw Object.assign(new Error(`${text} was not found in official UP Bhulekh selection list.`), {
      statusCode: 404,
      details: { requestedText: text },
    });
  }
  await target.click();
  await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(2500);
};

const optionMatch = (options, requestedText) => {
  if (!requestedText || !options || !options.length) return undefined;
  const requested = normalize(requestedText);

  let matched = options.find((option) => normalize(option) === requested);
  if (matched) return matched;

  matched = options.find((option) => normalize(option).includes(requested) || requested.includes(normalize(option)));
  if (matched) return matched;

  matched = options.find((option) => {
    const cleanOpt = normalize(option.replace(/\([^)]*\)/g, ''));
    return cleanOpt === requested || cleanOpt.includes(requested) || requested.includes(cleanOpt);
  });
  if (matched) return matched;

  let bestMatch = undefined;
  let bestScore = 0.65;
  for (const option of options) {
    const cleanOpt = normalize(option.replace(/\([^)]*\)/g, ''));
    const score = Math.max(fuzzyMatchScore(option, requestedText), fuzzyMatchScore(cleanOpt, requestedText));
    if (score > bestScore) {
      bestScore = score;
      bestMatch = option;
    }
  }
  return bestMatch;
};

const openSelection = async (page) => {
  await page.goto(UP_BHULEKH_HOME_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(3500);
  await page.locator('.card.card-hover').filter({ hasText: 'खतौनी' }).first().click();
  await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(2500);
};

const readSelection = async (page) => {
  const bodyText = await page.locator('body').innerText({ timeout: 20000 });
  const districts = await readCellsUnderHeading(page, 'जनपद चुनें');
  const tehsils = await readCellsUnderHeading(page, 'तहसील चुनें');
  const villages = await readCellsUnderHeading(page, 'ग्राम का नाम / कोड चुनें');
  const years = await readCellsUnderHeading(page, 'वर्तमान खतौनी/पुरानी फसली वर्ष');

  return {
    districts: districts.length ? districts : sectionLines(bodyText, 'जनपद चुनें', ['तहसील चुनें', 'ग्राम का नाम']),
    tehsils: tehsils.length ? tehsils : sectionLines(bodyText, 'तहसील चुनें', ['ग्राम का नाम']),
    villages: villages.length ? villages : sectionLines(bodyText, 'ग्राम का नाम / कोड चुनें', ['वर्तमान खतौनी', 'Back']),
    years: (years.length ? years : sectionLines(bodyText, 'वर्तमान खतौनी/पुरानी फसली वर्ष', ['Back'])).filter((line) =>
      /वर्तमान|^\d{4}/.test(line),
    ),
  };
};

const getUpOptions = async ({ district, tehsil }) => {
  const browser = await chromium.launch(BROWSER_OPTIONS);
  try {
    const page = await browser.newPage({
      locale: 'en-IN',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    });
    page.setDefaultTimeout(90000);
    await openSelection(page);

    const result = {
      districts: [],
      tehsils: [],
      extraRegions: [],
      villages: [],
      years: [],
    };

    let options = await readSelection(page);
    result.districts = options.districts;
    if (!district) return result;

    const districtOption = optionMatch(result.districts, district);
    if (!districtOption) {
      throw Object.assign(new Error(`${district} was not found in official UP Bhulekh district list.`), {
        statusCode: 404,
        details: { requestedText: district, options: result.districts.slice(0, 80) },
      });
    }

    await clickExactText(page, districtOption);
    options = await readSelection(page);
    result.tehsils = options.tehsils;
    if (!tehsil) return result;

    const tehsilOption = optionMatch(result.tehsils, tehsil);
    if (!tehsilOption) {
      throw Object.assign(new Error(`${tehsil} was not found in official UP Bhulekh tehsil list.`), {
        statusCode: 404,
        details: { requestedText: tehsil, options: result.tehsils.slice(0, 80) },
      });
    }

    await clickExactText(page, tehsilOption, true);
    options = await readSelection(page);
    result.villages = options.villages;
    result.years = options.years.length ? options.years : ['वर्तमान खतौनी'];
    return result;
  } finally {
    await browser.close();
  }
};

const verifyUpLandRecord = async () => {
  throw Object.assign(
    new Error(
      'UP Bhulekh official dropdowns are available, but final Khatauni record extraction requires the live portal verification step. Enter exact property details manually or upload the land document for review.',
    ),
    { statusCode: 409 },
  );
};

module.exports = { getUpOptions, verifyUpLandRecord, __testing: { sectionLines, normalize } };
