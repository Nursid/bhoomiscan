const { verifyMeonLandRecord } = require('../server/meonLandClient');

const originalEnv = process.env;

const baseEnv = {
  MEON_BASE_URL: 'https://api.meon.co.in',
  MEON_API_KEY: 'test-api-key',
  MEON_PUNJAB_SIGNATURE: 'punjab-signature',
  MEON_MAHARASHTRA_SIGNATURE: 'maharashtra-signature',
  MEON_UP_SIGNATURE: 'up-signature',
  MEON_RAJASTHAN_SIGNATURE: 'rajasthan-signature',
  MEON_MP_SIGNATURE: 'mp-signature',
};

const successResponse = {
  ok: true,
  status: 200,
  text: jest.fn().mockResolvedValue(JSON.stringify({ owner: 'Record Holder', khasra: '102', area: '1 acre' })),
};

describe('Meon land record client', () => {
  beforeEach(() => {
    process.env = { ...originalEnv, ...baseEnv };
    global.fetch = jest.fn().mockResolvedValue(successResponse);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  const cases = [
    {
      name: 'Punjab',
      params: {
        state: 'Punjab',
        year: '2024-2025',
        district: 'Amritsar',
        tehsil: 'Amritsar-1',
        village: 'Village A',
        searchValue: '14//25/2',
      },
      endpoint: '/api/v1/public/pun-land-verify/v1/pun-land-verify/',
      signature: 'punjab-signature',
      body: {
        year: '2024-2025',
        state: 'Punjab',
        khasra: '14//25/2',
        tehsil: 'Amritsar-1',
        village: 'Village A',
        district: 'Amritsar',
      },
    },
    {
      name: 'Maharashtra',
      params: {
        state: 'Maharashtra',
        category: 'Rural',
        district: 'Akola',
        tehsil: 'Akot',
        village: 'Village B',
        searchValue: '102',
      },
      endpoint: '/api/v1/public/land-maha-verify/v1/land-maha-verify/',
      signature: 'maharashtra-signature',
      body: {
        state: 'Maharashtra',
        category: 'Rural',
        district: 'Akola',
        taluka: 'Akot',
        village: 'Village B',
        plot_no: '102',
      },
    },
    {
      name: 'Uttar Pradesh',
      params: {
        state: 'Uttar Pradesh',
        district: 'Lucknow',
        tehsil: 'Sadar',
        village: 'Village C',
        searchValue: '45',
      },
      endpoint: '/api/v1/public/land-verify/v1/land-verify/',
      signature: 'up-signature',
      body: {
        tehsil: 'Sadar',
        village: 'Village C',
        district: 'Lucknow',
        khata_number: '45',
      },
    },
    {
      name: 'Rajasthan',
      params: {
        state: 'Rajasthan',
        district: 'Jaipur',
        tehsil: 'Sanganer',
        village: 'Village D',
        ri: 'RI 1',
        halka: 'Halka 2',
        sheetNo: 'Sheet 3',
        searchValue: '697',
      },
      endpoint: '/api/v1/public/rajas-land-verify/v1/rajas-land-verify/',
      signature: 'rajasthan-signature',
      body: {
        ri: 'RI 1',
        halka: 'Halka 2',
        state: 'Rajasthan',
        khasra: '697',
        tehsil: 'Sanganer',
        village: 'Village D',
        district: 'Jaipur',
        sheet_no: 'Sheet 3',
      },
    },
    {
      name: 'Madhya Pradesh',
      params: {
        state: 'Madhya Pradesh',
        category: 'Rural',
        district: 'Bhopal',
        tehsil: 'Huzur',
        village: 'Village E',
        searchValue: '88',
      },
      endpoint: '/api/v1/public/mp-land-very/v1/mp-land-verify/',
      signature: 'mp-signature',
      body: {
        state: 'Madhya Pradesh',
        taluka: 'Huzur',
        plot_no: '88',
        village: 'Village E',
        category: 'Rural',
        district: 'Bhopal',
      },
    },
  ];

  it.each(cases)('posts exact $name payload and headers', async ({ params, endpoint, signature, body }) => {
    await verifyMeonLandRecord({ ...params, ownerName: 'Owner' });

    expect(global.fetch).toHaveBeenCalledWith(`https://api.meon.co.in${endpoint}`, expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'X-API-Key': 'test-api-key',
        'X-Signature': signature,
        'Idempotency-Key': expect.stringMatching(/^idem-/),
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(body),
    }));
  });

  it('generates a fresh idempotency key for every request', async () => {
    await verifyMeonLandRecord({ ...cases[0].params, ownerName: 'Owner' });
    await verifyMeonLandRecord({ ...cases[0].params, ownerName: 'Owner' });

    const firstHeaders = global.fetch.mock.calls[0][1].headers;
    const secondHeaders = global.fetch.mock.calls[1][1].headers;
    expect(firstHeaders['Idempotency-Key']).toEqual(expect.stringMatching(/^idem-/));
    expect(secondHeaders['Idempotency-Key']).toEqual(expect.stringMatching(/^idem-/));
    expect(firstHeaders['Idempotency-Key']).not.toBe(secondHeaders['Idempotency-Key']);
  });

  it('trims submitted values without changing Unicode content', async () => {
    await verifyMeonLandRecord({
      state: 'Maharashtra',
      category: ' Rural ',
      district: ' 05 अकोला ',
      tehsil: ' 02 आकोट ',
      village: ' 270500020047510000 अकोलखेड ',
      searchValue: ' 102 ',
      ownerName: 'Owner',
    });

    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      state: 'Maharashtra',
      category: 'Rural',
      district: '05 अकोला',
      taluka: '02 आकोट',
      village: '270500020047510000 अकोलखेड',
      plot_no: '102',
    });
  });
});
