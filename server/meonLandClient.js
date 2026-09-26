const { createHash, randomUUID } = require('crypto');

const STATE_CONFIGS = {
  punjab: {
    endpoint: '/api/v1/public/pun-land-verify/v1/pun-land-verify/',
    signatureEnv: 'MEON_PUNJAB_SIGNATURE',
    source: 'Meon Punjab Land Record Check API',
    buildPayload: (params) => ({
      year: params.year,
      state: params.state,
      khasra: params.searchValue,
      tehsil: params.tehsil,
      village: params.village,
      district: params.district,
    }),
  },
  maharashtra: {
    endpoint: '/api/v1/public/land-maha-verify/v1/land-maha-verify/',
    signatureEnv: 'MEON_MAHARASHTRA_SIGNATURE',
    source: 'Meon Maharashtra Land Record Check API',
    buildPayload: (params) => ({
      state: params.state,
      category: params.category,
      district: params.district,
      taluka: params.tehsil,
      village: params.village,
      plot_no: params.searchValue,
    }),
  },
  'uttar pradesh': {
    endpoint: '/api/v1/public/land-verify/v1/land-verify/',
    signatureEnv: 'MEON_UP_SIGNATURE',
    source: 'Meon Uttar Pradesh Land Record Check API',
    buildPayload: (params) => ({
      tehsil: params.tehsil,
      village: params.village,
      district: params.district,
      khata_number: params.searchValue,
    }),
  },
  rajasthan: {
    endpoint: '/api/v1/public/rajas-land-verify/v1/rajas-land-verify/',
    signatureEnv: 'MEON_RAJASTHAN_SIGNATURE',
    source: 'Meon Rajasthan Land Record Check API',
    buildPayload: (params) => ({
      ri: params.ri,
      halka: params.halka,
      state: params.state,
      khasra: params.searchValue,
      tehsil: params.tehsil,
      village: params.village,
      district: params.district,
      sheet_no: params.sheetNo || params.sheet_no,
    }),
  },
  'madhya pradesh': {
    endpoint: '/api/v1/public/mp-land-very/v1/mp-land-verify/',
    signatureEnv: 'MEON_MP_SIGNATURE',
    source: 'Meon Madhya Pradesh Land Record Check API',
    buildPayload: (params) => ({
      state: params.state,
      taluka: params.tehsil,
      plot_no: params.searchValue,
      village: params.village,
      category: params.category,
      district: params.district,
    }),
  },
};

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getStateConfig = (state) => STATE_CONFIGS[normalize(state)];

const trimPayload = (payload) =>
  Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]),
  );

const publicLandErrorMessage = (statusCode) => {
  if (statusCode === 400 || statusCode === 422) return 'Please check the land record details and try again.';
  if (statusCode === 401 || statusCode === 403) return 'Land record service credentials are not configured correctly on the backend.';
  if (statusCode === 404) return 'No matching land record was found for the entered details.';
  if (statusCode === 409) return 'This land record request was already processed. Please retry with fresh details.';
  if (statusCode === 429) return 'The land record service is busy. Please wait a moment and try again.';
  if (statusCode >= 500) return 'The land record service is temporarily unavailable. Please try again later.';
  return 'Land record lookup failed. Please try again.';
};

const flattenObjectRows = (value, prefix = '') => {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) {
    if (!value.length) return [];
    if (value.every((item) => typeof item !== 'object' || item === null)) {
      return [value.map((item) => String(item))];
    }
    return value.flatMap((item) => flattenObjectRows(item, prefix));
  }
  if (typeof value === 'object') {
    const scalarEntries = Object.entries(value).filter(([, entryValue]) => (
      entryValue === null || typeof entryValue !== 'object'
    ));
    const rows = scalarEntries.length
      ? [scalarEntries.map(([key, entryValue]) => `${key}: ${entryValue ?? ''}`)]
      : [];
    const nestedRows = Object.entries(value)
      .filter(([, entryValue]) => entryValue && typeof entryValue === 'object')
      .flatMap(([key, entryValue]) => flattenObjectRows(entryValue, prefix ? `${prefix}.${key}` : key));
    return [...rows, ...nestedRows];
  }
  return [[prefix ? `${prefix}: ${value}` : String(value)]];
};

const findValue = (data, patterns) => {
  const queue = [data];
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') continue;
    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }
    for (const [key, value] of Object.entries(current)) {
      if (patterns.some((pattern) => pattern.test(key)) && value !== null && typeof value !== 'object') {
        return String(value);
      }
      if (value && typeof value === 'object') queue.push(value);
    }
  }
  return '';
};

const normalizeMeonRecord = ({ params, requestPayload, data, source, sourceUrl }) => {
  const officialRows = flattenObjectRows(data).slice(0, 80);
  const recordText = officialRows.flat().join(' ');
  if (!officialRows.length || /not\s*found|no\s*record|invalid|failed/i.test(recordText)) {
    throw Object.assign(new Error('No official land record was returned by Meon for the selected search.'), {
      statusCode: 404,
      details: data,
    });
  }

  const surveyNo =
    findValue(data, [/khasra/i, /survey/i, /plot/i, /gata/i, /cts/i]) ||
    requestPayload.khasra ||
    requestPayload.plot_no ||
    params.searchValue ||
    '';
  const registrationNumber =
    findValue(data, [/registration/i, /reg(_|i)?no/i, /document/i]) ||
    `MEON-${createHash('sha1').update(JSON.stringify(requestPayload)).digest('hex').slice(0, 12).toUpperCase()}`;

  return {
    registrationNumber,
    ownerName: findValue(data, [/owner/i, /name/i, /khatedar/i]) || params.ownerName || 'Verified land record holder',
    surveyNo,
    khewatNo: findValue(data, [/khewat/i, /khata/i]) || (params.searchType === 'Khata' ? params.searchValue : ''),
    area: findValue(data, [/area/i, /rakba/i, /rakam/i]) || '',
    estimatedValuation: findValue(data, [/valuation/i, /value/i]) || '',
    subRegistrarOffice: params.tehsil,
    district: params.district,
    state: params.state,
    registrationDate: findValue(data, [/date/i]) || '',
    village: params.village,
    year: params.year || 'CURRENT',
    source,
    sourceUrl,
    officialRows,
    verifiedBy: source,
    rawResponse: data,
  };
};

const verifyMeonLandRecord = async (params) => {
  const config = getStateConfig(params.state);
  if (!config) return null;
  const meonApiKey = process.env.MEON_API_KEY || '';
  if (!meonApiKey) {
    throw Object.assign(new Error('Land record service is not configured on the backend.'), {
      statusCode: 500,
      exposeDetails: false,
    });
  }

  const signature = process.env[config.signatureEnv];
  if (!signature) {
    throw Object.assign(new Error('Land record service signature is not configured on the backend.'), {
      statusCode: 500,
      exposeDetails: false,
    });
  }

  const requestPayload = trimPayload(config.buildPayload(params));
  const missing = Object.entries(requestPayload)
    .filter(([, value]) => value === undefined || value === null || String(value).trim() === '')
    .map(([key]) => key);
  if (missing.length) {
    throw Object.assign(new Error(`Missing land lookup parameter(s): ${missing.join(', ')}`), {
      statusCode: 400,
      exposeDetails: false,
    });
  }

  const sourceUrl = `${(process.env.MEON_BASE_URL || 'https://api.meon.co.in').replace(/\/+$/, '')}${config.endpoint}`;
  const idempotencyKey = params.idempotencyKey || `idem-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const response = await fetch(sourceUrl, {
    method: 'POST',
    headers: {
      'X-API-Key': meonApiKey,
      'X-Signature': signature,
      'Idempotency-Key': idempotencyKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestPayload),
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw Object.assign(new Error(publicLandErrorMessage(response.status)), {
      statusCode: response.status,
      exposeDetails: false,
    });
  }

  return normalizeMeonRecord({
    params,
    requestPayload,
    data,
    source: config.source,
    sourceUrl,
  });
};

module.exports = {
  verifyMeonLandRecord,
  hasMeonLandState: (state) => !!getStateConfig(state),
  __testing: { STATE_CONFIGS, getStateConfig, trimPayload },
};
