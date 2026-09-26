const msg91 = require('../server/msg91Client');
const authTokens = require('../server/authTokens');
const mobileVerifyModule = require('../server/mobileVerify');

const { mobileVerify, me, normalizeMobile } = mobileVerifyModule;

const JWT_SECRET = 'unit-test-secret-that-is-definitely-longer-than-32-chars';

const WIDGET_ID = '36696a726742343833383133';
const TOKEN_AUTH = 'test-widget-token-auth';
const REQ_ID = '36697a6f694a353432323432';
const GOOD = { mobile: '917081002501', otp: '488412', reqId: REQ_ID };

let fetchCalls;
const mockMsg91 = (responder) => {
  global.fetch = jest.fn(async (url, options) => {
    const body = JSON.parse(options.body);
    fetchCalls.push({ url, options, body });
    const result = await responder(body);
    if (result instanceof Error) {
      throw result;
    }
    return {
      ok: result.ok !== false,
      status: result.status || 200,
      text: async () => (typeof result.text === 'string' ? result.text : JSON.stringify(result.body)),
    };
  });
};

const expectRejection = async (promise, statusCode, message) => {
  let caught;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeDefined();
  expect(caught.statusCode).toBe(statusCode);
  expect(caught.message).toBe(message);
  expect(caught.success).toBe(false);
  return caught;
};

const originalIssueLogin = mobileVerifyModule.issueApplicationLogin;

beforeEach(() => {
  fetchCalls = [];
  process.env.MSG91_WIDGET_ID = WIDGET_ID;
  process.env.MSG91_TOKEN_AUTH = TOKEN_AUTH;
  process.env.MSG91_AUTH_KEY = '';
  process.env.JWT_SECRET = JWT_SECRET;
  delete process.env.MSG91_DEBUG_VERIFY_RESPONSE;
  mobileVerifyModule.issueApplicationLogin = originalIssueLogin;
  mockMsg91(() => ({ body: { type: 'success', message: 'OTP verified success' } }));
});

afterAll(() => {
  delete global.fetch;
});

describe('mobile normalization', () => {
  it('resolves Indian formats to one canonical value', () => {
    const expected = { e164: '+917081002501', digits: '917081002501', countryCode: '91', national: '7081002501' };
    ['7081002501', '07081002501', '917081002501', '+917081002501', '+91 70810-02501', '0091 7081002501'].forEach((v) => {
      expect(normalizeMobile(v)).toEqual(expected);
    });
  });

  it('keeps other countries when the code is explicit and rejects junk', () => {
    expect(normalizeMobile('+14155552671')).toEqual({ e164: '+14155552671', digits: '14155552671', countryCode: null, national: null });
    ['', '12345', 'abc', '1234567890', 'user@example.com', null, undefined].forEach((v) => expect(normalizeMobile(v)).toBeNull());
  });
});

describe('POST /api/auth/mobile-verify', () => {
  it('verifies the OTP with MSG91 using widgetId + tokenAuth + reqId + otp and returns the backend login JWT', async () => {
    const result = await mobileVerify(GOOD);

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe('https://control.msg91.com/api/v5/widget/verifyOtp');
    expect(fetchCalls[0].options.method).toBe('POST');
    expect(fetchCalls[0].body).toEqual({ widgetId: WIDGET_ID, tokenAuth: TOKEN_AUTH, reqId: REQ_ID, otp: '488412' });
    expect(Object.keys(fetchCalls[0].options.headers).map((h) => h.toLowerCase())).toEqual(['content-type', 'accept']);

    expect(result).toEqual({
      success: true,
      token: expect.any(String),
      user: {
        id: '+917081002501',
        mobile: '+917081002501',
        loginMethod: 'mobile_otp',
        lastLoginAt: expect.any(String),
      },
    });
    // The token is OUR backend JWT, verifiable with our secret, not anything from MSG91.
    const claims = authTokens.verifyToken(result.token);
    expect(claims.sub).toBe('+917081002501');
    expect(claims.loginMethod).toBe('mobile_otp');
  });

  it('the returned token authenticates a protected route via Authorization: Bearer', async () => {
    const { token } = await mobileVerify(GOOD);

    const profile = await me({}, { headers: { authorization: `Bearer ${token}` } });
    expect(profile).toMatchObject({ success: true, user: { id: '+917081002501', mobile: '+917081002501', loginMethod: 'mobile_otp' } });
    expect(profile.expiresAt).toEqual(expect.any(String));

    await expectRejection(me({}, { headers: {} }), 401, 'Authorization token is required');
    await expectRejection(me({}, { headers: { authorization: 'Bearer not-a-real-token' } }), 401, 'Invalid login token');
  });

  it('fails closed when JWT_SECRET is not configured', async () => {
    process.env.JWT_SECRET = '';
    await expectRejection(mobileVerify(GOOD), 503, 'Login tokens are not configured on the server (JWT_SECRET).');
    expect(fetchCalls).toHaveLength(0);
  });

  it('falls back to the account auth key header when tokenAuth is not set', async () => {
    process.env.MSG91_TOKEN_AUTH = '';
    process.env.MSG91_AUTH_KEY = 'account-auth-key';

    await mobileVerify(GOOD);

    expect(fetchCalls[0].body).toEqual({ widgetId: WIDGET_ID, reqId: REQ_ID, otp: '488412' });
    expect(fetchCalls[0].options.headers.authkey).toBe('account-auth-key');
  });

  it('ignores client-supplied identity fields and identifies the user by the verified mobile only', async () => {
    const result = await mobileVerify({ ...GOOD, verified: true, userId: 'attacker', id: 'attacker' });
    expect(result.user.id).toBe('+917081002501');
    expect(authTokens.verifyToken(result.token).sub).toBe('+917081002501');
  });

  it('validates the request before contacting MSG91', async () => {
    await expectRejection(mobileVerify({ ...GOOD, mobile: '12345' }), 400, 'Invalid mobile number');
    await expectRejection(mobileVerify({ ...GOOD, mobile: undefined }), 400, 'Invalid mobile number');
    await expectRejection(mobileVerify({ ...GOOD, otp: '' }), 400, 'Invalid OTP');
    await expectRejection(mobileVerify({ ...GOOD, otp: 'abc123' }), 400, 'Invalid OTP');
    await expectRejection(mobileVerify({ ...GOOD, otp: '12' }), 400, 'Invalid OTP');
    await expectRejection(mobileVerify({ ...GOOD, reqId: '' }), 400, 'reqId is required');
    await expectRejection(mobileVerify({ ...GOOD, reqId: 'bad id!' }), 400, 'reqId is required');
    await expectRejection(mobileVerify({ ...GOOD, reqId: 12345 }), 400, 'reqId is required');
    expect(fetchCalls).toHaveLength(0);
  });

  it('accepts a numeric OTP value and mobile in any supported format', async () => {
    await expect(mobileVerify({ mobile: '+91 7081002501', otp: 488412, reqId: REQ_ID })).resolves.toMatchObject({ user: { mobile: '+917081002501' } });
    expect(fetchCalls[0].body.otp).toBe('488412');
  });

  it('returns 401 for a wrong, reused or expired OTP (live-observed shapes)', async () => {
    mockMsg91(() => ({ body: { message: 'otp already verifed', type: 'error', code: 703 } }));
    await expectRejection(mobileVerify(GOOD), 401, 'Invalid or expired OTP');

    mockMsg91(() => ({ body: { message: 'no request found', type: 'error', code: 709 } }));
    await expectRejection(mobileVerify(GOOD), 401, 'Invalid or expired OTP');

    mockMsg91(() => ({ body: { message: 'OTP not match', type: 'error', code: 702 } }));
    await expectRejection(mobileVerify(GOOD), 401, 'Invalid or expired OTP');

    mockMsg91(() => ({ body: { message: 'otp expired', type: 'error' } }));
    await expectRejection(mobileVerify(GOOD), 401, 'Invalid or expired OTP');
  });

  it('returns 503 when MSG91 rejects our widget credentials or they are missing', async () => {
    mockMsg91(() => ({ body: { message: 'AuthenticationFailure', type: 'error', code: 401 } }));
    await expectRejection(mobileVerify(GOOD), 503, 'Mobile OTP login is not configured on the server (MSG91).');

    process.env.MSG91_TOKEN_AUTH = '';
    process.env.MSG91_AUTH_KEY = '';
    fetchCalls = [];
    await expectRejection(mobileVerify(GOOD), 503, 'Mobile OTP login is not configured on the server (MSG91).');
    expect(fetchCalls).toHaveLength(0);

    process.env.MSG91_TOKEN_AUTH = TOKEN_AUTH;
    process.env.MSG91_WIDGET_ID = '';
    await expectRejection(mobileVerify(GOOD), 503, 'Mobile OTP login is not configured on the server (MSG91).');
  });

  it('returns 502 on MSG91 timeout, network failure or malformed response', async () => {
    mockMsg91(() => Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await expectRejection(mobileVerify(GOOD), 502, 'Unable to verify OTP with MSG91.');
    mockMsg91(() => new Error('ECONNRESET'));
    await expectRejection(mobileVerify(GOOD), 502, 'Unable to verify OTP with MSG91.');
    mockMsg91(() => ({ text: '<html>gateway error</html>', status: 502, ok: false }));
    await expectRejection(mobileVerify(GOOD), 502, 'Unable to verify OTP with MSG91.');
    mockMsg91(() => ({ text: '' }));
    await expectRejection(mobileVerify(GOOD), 502, 'Unable to verify OTP with MSG91.');
  });

  it('enforces that the mobile matches the identifier when MSG91 echoes one', async () => {
    mockMsg91(() => ({ body: { type: 'success', identifier: '917081002501' } }));
    await expect(mobileVerify({ ...GOOD, mobile: '+91 7081002501' })).resolves.toMatchObject({ user: { mobile: '+917081002501' } });

    mockMsg91(() => ({ body: { type: 'success', data: { mobile: '919999999999' } } }));
    await expectRejection(mobileVerify(GOOD), 401, 'Mobile number does not match the verified OTP session');
  });

  it('never logs the OTP or MSG91 credentials', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.MSG91_DEBUG_VERIFY_RESPONSE = 'true';
    mockMsg91(() => ({ body: { type: 'success', message: 'OTP verified', tokenAuth: TOKEN_AUTH } }));

    await mobileVerify(GOOD);
    mockMsg91(() => ({ body: { message: 'OTP not match', type: 'error', code: 702 } }));
    await mobileVerify(GOOD).catch(() => {});

    const output = [...logSpy.mock.calls, ...warnSpy.mock.calls].flat().map(String).join('\n');
    expect(output).not.toContain('488412');
    expect(output).not.toContain(TOKEN_AUTH);
    expect(output).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./);
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });
});

describe('msg91Client helpers', () => {
  it('classifies MSG91 error bodies and redacts credentials', () => {
    expect(msg91.__testing.isOtpRejection({ message: 'otp already verifed', code: 703 })).toBe(true);
    expect(msg91.__testing.isOtpRejection({ message: 'no request found', code: 709 })).toBe(true);
    expect(msg91.__testing.isCredentialFailure({ message: 'AuthenticationFailure', code: 401 })).toBe(true);
    expect(msg91.__testing.isCredentialFailure({ message: 'OTP not match', code: 702 })).toBe(false);
    expect(msg91.__testing.redactForLog({ tokenAuth: TOKEN_AUTH, type: 'success' })).not.toContain(TOKEN_AUTH);
  });
});
