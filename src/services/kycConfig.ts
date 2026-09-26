// Env loaded from .env via Babel inlineEnvPlugin
declare const process: {
  env: Record<string, string | undefined>;
};

export const decentroConfig = {
  digilockerRedirectUrl: 'trustledge://digilocker/callback',
};

export const trustledgeBackendConfig = {
  baseUrl: 'https://third-party-pa56.onrender.com',
};

export const meonConfig = {
  baseUrl: 'https://digilocker.meon.co.in',
  clientId: '69403',
  companyName: 'Destinyvaults',
  secretToken: 'B1hd2qRooyfNQ27F1QGZRHHfDX2DK5pW',
  redirectUrl: 'trustledge://digilocker/callback',
};

export const cloudinaryConfig = {
  cloudName: 'de6uqmt1m',
  uploadPreset: 'hm8borsg',
};
