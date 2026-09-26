import 'react-native-gesture-handler/jestSetup';

jest.mock(
  '@react-native-async-storage/async-storage',
  () => {
    const store = new Map();

    return {
      createAsyncStorage: jest.fn(() => ({
        getItem: jest.fn(key => Promise.resolve(store.get(key) ?? null)),
        setItem: jest.fn((key, value) => {
          store.set(key, value);
          return Promise.resolve();
        }),
        removeItem: jest.fn(key => {
          store.delete(key);
          return Promise.resolve();
        }),
      })),
      getItem: jest.fn(key => Promise.resolve(store.get(key) ?? null)),
      setItem: jest.fn((key, value) => {
        store.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn(key => {
        store.delete(key);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store.clear();
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Array.from(store.keys()))),
      multiGet: jest.fn(keys =>
        Promise.resolve(keys.map(key => [key, store.get(key) ?? null])),
      ),
      multiSet: jest.fn(entries => {
        entries.forEach(([key, value]) => store.set(key, value));
        return Promise.resolve();
      }),
      multiRemove: jest.fn(keys => {
        keys.forEach(key => store.delete(key));
        return Promise.resolve();
      }),
    };
  },
);

jest.mock('react-native-razorpay', () => ({
  __esModule: true,
  default: {
    open: jest.fn(() =>
      Promise.resolve({ razorpay_payment_id: 'test_payment_id' }),
    ),
  },
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() =>
      Promise.resolve({
        data: {
          idToken: 'test_id_token',
          user: {
            id: 'google_test_user',
            name: 'Test User',
            email: 'test@example.com',
            photo: null,
          },
        },
      }),
    ),
    getTokens: jest.fn(() => Promise.resolve({ accessToken: 'test_access_token' })),
    signOut: jest.fn(() => Promise.resolve()),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    WebView: (props) => React.createElement(View, props),
  };
});
