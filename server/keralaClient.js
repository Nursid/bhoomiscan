const { chromium } = require('playwright');

const BROWSER_OPTIONS = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
};

const KERALA_PORTAL_URL = 'https://landrevenue.kerala.gov.in/core/Office_websites/indexor.php?nm=default';

const DISTRICT_CODES = {
  KASARGOD: '1601',
  KANNUR: '1602',
  WAYANAD: '1603',
  KOZHIKODE: '1604',
  MALAPPURAM: '1605',
  PALAKKAD: '1606',
  THRISSUR: '1607',
  ERNAKULAM: '1608',
  IDUKKI: '1609',
  KOTTAYAM: '1610',
  ALAPPUZHA: '1611',
  PATHANAMTHITTA: '1612',
  KOLLAM: '1613',
  THIRUVANANTHAPURAM: '1614',
};

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\u0900-\u097f/(). -]+/g, '')
    .trim();

const clean = (value = '') => String(value).replace(/\s+/g, ' ').trim();

const optionMatch = (options, requestedText) => {
  const requested = normalize(requestedText);
  return (
    options.find((option) => normalize(option) === requested) ||
    options.find((option) => normalize(option).includes(requested)) ||
    options.find((option) => requested.includes(normalize(option)))
  );
};

const districtLabels = () => Object.keys(DISTRICT_CODES).map((district) => `${district} (${DISTRICT_CODES[district]})`);

const districtCodeFromLabel = (district) => {
  const match = optionMatch(districtLabels(), district);
  if (!match) {
    throw Object.assign(new Error(`${district} was not found in official Kerala Revenue district list.`), {
      statusCode: 404,
      details: { requestedText: district, options: districtLabels() },
    });
  }
  return (match.match(/\((\d+)\)/) || [])[1];
};

const villageCodeFromLabel = (village) => (String(village).match(/\[(.+)]$/) || [])[1] || '';

const villageOfficeUrl = (code) => `https://landrevenue.kerala.gov.in/core/Office_websites/indexor.php?nm=${encodeURIComponent(code)}`;

const readVillageLinks = async (page) => {
  const links = await page.locator('a[href*="indexor.php?nm="]').evaluateAll((anchors) =>
    anchors.map((anchor) => ({ text: anchor.textContent || '', href: anchor.href || '' })),
  );

  return links
    .map((link) => {
      const text = (link.text || '').replace(/\s+/g, ' ').trim();
      const code = new URL(link.href).searchParams.get('nm') || '';
      if (!text || !code || code === 'default' || !/village office/i.test(text)) return '';
      return `${text} [${code}]`;
    })
    .filter(Boolean);
};

const readSelectOptions = async (page, selector) =>
  page
    .locator(`${selector} option`)
    .evaluateAll((items) =>
      items
        .map((option) => (option.textContent || '').replace(/\s+/g, ' ').trim())
        .filter((text) => text && !/^--/.test(text)),
    )
    .catch(() => []);

const getKeralaOptions = async ({ district, village }) => {
  const result = {
    districts: districtLabels(),
    tehsils: ['Village Office'],
    extraRegions: [],
    villages: [],
    years: ['CURRENT'],
  };

  if (!district) return result;

  const browser = await chromium.launch(BROWSER_OPTIONS);
  try {
    const page = await browser.newPage({
      locale: 'en-IN',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    });
    page.setDefaultTimeout(90000);

    const districtCode = districtCodeFromLabel(district);
    await page.goto(`https://landrevenue.kerala.gov.in/core/Office_websites/village_offices.php?nm=default&districtsl=${districtCode}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await page.waitForTimeout(1500);
    result.villages = await readVillageLinks(page);

    if (!village) return result;

    const villageCode = villageCodeFromLabel(village);
    if (!villageCode) return result;
    await page.goto(villageOfficeUrl(villageCode), { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(1500);
    result.extraRegions = await readSelectOptions(page, '#block');
    return result;
  } finally {
    await browser.close();
  }
};

const verifyKeralaLandRecord = async () => {
  throw Object.assign(
    new Error(
      'Kerala Revenue village-office dropdowns are loaded from the official portal. The visible public form returns village/block information but does not expose owner-record extraction fields for unattended verification.',
    ),
    { statusCode: 409 },
  );
};

module.exports = { getKeralaOptions, verifyKeralaLandRecord, __testing: { districtLabels, districtCodeFromLabel, villageCodeFromLabel, optionMatch } };
