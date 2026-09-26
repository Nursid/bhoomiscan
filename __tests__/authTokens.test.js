const authTokens = require('../server/authTokens');

const SECRET = 'unit-test-secret-that-is-definitely-longer-than-32-chars';

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
  delete process.env.JWT_EXPIRES_IN;
  delete process.env.JWT_ISSUER;
});

describe('authTokens', () => {
  it('issues a token whose claims identify the user and verifies it', () => {
    const token = authTokens.generateToken({ id: '+917081002501', mobile: '+917081002501', loginMethod: 'mobile_otp' });
    expect(token.split('.')).toHaveLength(3);

    const claims = authTokens.verifyToken(token);
    expect(claims.sub).toBe('+917081002501');
    expect(claims.mobile).toBe('+917081002501');
    expect(claims.loginMethod).toBe('mobile_otp');
    expect(claims.iss).toBe('trustledge-backend');
    expect(claims.exp - claims.iat).toBe(7 * 24 * 60 * 60);
  });

  it('reads the token from an Authorization: Bearer header via requireAuth', () => {
    const token = authTokens.generateToken({ id: 'u1', mobile: '+917081002501' });
    expect(authTokens.requireAuth({ headers: { authorization: `Bearer ${token}` } }).sub).toBe('u1');
    expect(authTokens.requireAuth({ headers: { Authorization: `bearer ${token}` } }).sub).toBe('u1');
  });

  it('rejects missing, tampered, foreign and expired tokens with 401', () => {
    const expectStatus = (fn, status, message) => {
      let caught;
      try {
        fn();
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeDefined();
      expect(caught.statusCode).toBe(status);
      expect(caught.success).toBe(false);
      if (message) {
        expect(caught.message).toBe(message);
      }
    };

    expectStatus(() => authTokens.requireAuth({ headers: {} }), 401, 'Authorization token is required');
    expectStatus(() => authTokens.requireAuth({ headers: { authorization: 'Token abc' } }), 401, 'Authorization token is required');

    const token = authTokens.generateToken({ id: 'u1' });
    const tampered = `${token.slice(0, -2)}xx`;
    expectStatus(() => authTokens.verifyToken(tampered), 401, 'Invalid login token');

    process.env.JWT_SECRET = 'another-secret-that-is-also-longer-than-32-characters';
    expectStatus(() => authTokens.verifyToken(token), 401, 'Invalid login token');
    process.env.JWT_SECRET = SECRET;

    process.env.JWT_EXPIRES_IN = '-1s';
    const expired = authTokens.generateToken({ id: 'u1' });
    expectStatus(() => authTokens.verifyToken(expired), 401, 'Login token has expired');
  });

  it('fails closed when JWT_SECRET is missing or too short', () => {
    process.env.JWT_SECRET = 'short';
    expect(authTokens.isConfigured()).toBe(false);
    expect(() => authTokens.generateToken({ id: 'u1' })).toThrow(/JWT_SECRET/);
    expect(() => authTokens.verifyToken('x.y.z')).toThrow(/JWT_SECRET/);
  });
});
