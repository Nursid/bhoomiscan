import { trustledgeBackendConfig } from './kycConfig';
export { trustledgeBackendConfig };

export interface LandVerificationRequest {
  state?: string;
  district: string;
  tehsil: string;
  extraRegion?: string;
  category?: string;
  ri?: string;
  halka?: string;
  sheetNo?: string;
  village: string;
  year: string;
  searchType: 'Khasra' | 'Khewat' | 'Owner' | 'Khata' | 'Gata' | 'Survey' | 'Plot' | 'Khatiyan' | 'Tenant' | 'UPIN' | 'CTS' | 'Jamabandi';
  searchValue?: string;
  ownerName: string;
}

export interface LandVerificationResult {
  registrationNumber: string;
  ownerName: string;
  surveyNo?: string;
  khewatNo?: string;
  area?: string;
  estimatedValuation?: string;
  subRegistrarOffice: string;
  district: string;
  state: string;
  registrationDate?: string;
  village: string;
  year: string;
  source: string;
  sourceUrl: string;
  officialRows: Array<string[] | { values: string[] }>;
  verifiedBy: string;
}

export interface LandOptionsRequest {
  state: string;
  district?: string;
  tehsil?: string;
  village?: string;
  extraRegion?: string;
}

export interface LandOptionsResult {
  districts: string[];
  tehsils: string[];
  extraRegions?: string[];
  villages: string[];
  years: string[];
}

class LandApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LandApiError';
  }
}

export const LAND_MANUAL_REVIEW_MESSAGE =
  'Your data is not available on government portal please add manual';

export const sanitizeLandLookupMessage = (value: any) => {
  if (!value) return '';
  let str = '';
  if (typeof value === 'string') {
    str = value;
  } else {
    try {
      str = JSON.stringify(value);
    } catch {
      str = String(value);
    }
  }

  const compact = str.replace(/\s+/g, ' ').trim();

  // Sanitize raw Playwright/Chromium backend errors for user-friendly display
  if (/playwright|chromium|browserType|chrome-headless-shell|ms-playwright/i.test(compact)) {
    return 'Official land portal connector is initializing browser verification engine. Please retry in a few moments or upload document manually.';
  }

  if (/static\/demo|demo land|static land/i.test(compact)) {
    return LAND_MANUAL_REVIEW_MESSAGE;
  }

  if (/meon|api[_\s-]?key|signature|backend environment variable|land record service is not configured/i.test(compact)) {
    return LAND_MANUAL_REVIEW_MESSAGE;
  }

  if (
    /<!doctype|<html|<\/style>|<script|<body|data:image|%3csvg|clip-path|favicon|\.request-id|footer\s*\{|margin-bottom|padding:/i.test(compact) ||
    compact.length > 320
  ) {
    return LAND_MANUAL_REVIEW_MESSAGE;
  }

  if (/not found|no matching|no official land record|no record|not returned/i.test(compact)) {
    return LAND_MANUAL_REVIEW_MESSAGE;
  }

  return compact;
};

export const fetchLandOptions = async (payload: LandOptionsRequest): Promise<LandOptionsResult> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${trustledgeBackendConfig.baseUrl.replace(/\/+$/, '')}/api/land/options`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      throw new LandApiError(sanitizeLandLookupMessage(data?.message || data?.details) || 'Official land options lookup failed.');
    }

    return {
      districts: Array.isArray(data?.districts) ? data.districts : [],
      tehsils: Array.isArray(data?.tehsils) ? data.tehsils : [],
      extraRegions: Array.isArray(data?.extraRegions) ? data.extraRegions : [],
      villages: Array.isArray(data?.villages) ? data.villages : [],
      years: Array.isArray(data?.years) ? data.years : [],
    };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new LandApiError('Official land dropdowns are taking longer than expected. Please try again.');
    }
    if (error instanceof LandApiError) {
      throw error;
    }
    throw new LandApiError('Cannot reach TrustLedge backend for official land dropdowns.');
  } finally {
    clearTimeout(timeout);
  }
};



export const verifyLandRecord = async (
  payload: LandVerificationRequest,
): Promise<LandVerificationResult> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${trustledgeBackendConfig.baseUrl.replace(/\/+$/, '')}/api/land/verify`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      throw new LandApiError(sanitizeLandLookupMessage(data?.message || data?.details) || 'Official land lookup failed.');
    }

    if (!data?.officialRows?.length) {
      throw new LandApiError(LAND_MANUAL_REVIEW_MESSAGE);
    }

    return data as LandVerificationResult;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new LandApiError('Official land lookup is taking longer than expected. Please try again in a few minutes.');
    }
    if (error instanceof LandApiError) {
      throw error;
    }
    throw new LandApiError('Cannot reach TrustLedge backend for official land lookup. Start or host the backend and try again.');
  } finally {
    clearTimeout(timeout);
  }
};

export type EmailNotificationType =
  | 'welcome'
  | 'kyc_success'
  | 'vault_save'
  | 'data_fetching'
  | 'beneficiary_added'
  | 'land_status';

export interface CustomEmailPayload {
  to: string;
  type: EmailNotificationType;
  userName?: string;
  ownerName?: string;
  state?: string;
  district?: string;
  tehsil?: string;
  extraRegion?: string;
  village?: string;
  year?: string;
  searchType?: string;
  searchValue?: string;
  registrationNumber?: string;
  transactionHash?: string;
  paymentId?: string;
  kycType?: 'Aadhaar' | 'PAN' | 'Aadhaar & PAN';
  beneficiaryName?: string;
  relationship?: string;
  contactNumber?: string;
  beneficiaryEmail?: string;
  walletAddress?: string;
  idProofName?: string;
  status?: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  surveyNo?: string;
  area?: string;
}

export const sendUnifiedEmailNotification = async (payload: CustomEmailPayload) => {
  if (!payload.to || !payload.to.includes('@')) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `${trustledgeBackendConfig.baseUrl.replace(/\/+$/, '')}/api/notifications/send-email`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    if (!response.ok) {
      const text = await response.text();
      console.warn('Unified email notification notice:', text);
    }
  } catch (error: any) {
    const message =
      error?.name === 'AbortError'
        ? 'Email notification request timed out.'
        : error?.message || error;
    console.warn('Unified email notification notice:', message);
  } finally {
    clearTimeout(timeout);
  }
};

export const sendCustomEmailNotification = sendUnifiedEmailNotification;

export const sendLandStatusEmail = (payload: any) =>
  sendUnifiedEmailNotification({ ...payload, type: payload.type || 'land_status' });

export const verifyRemotePaymentStatus = async (userEmail?: string, userId?: string) => {
  try {
    const params = new URLSearchParams();
    if (userEmail) params.append('email', userEmail);
    if (userId) params.append('userId', userId);
    const response = await fetch(
      `${trustledgeBackendConfig.baseUrl.replace(/\/+$/, '')}/api/payments/verify-status?${params.toString()}`
    );
    if (response.ok) {
      return await response.json();
    }
  } catch (error: any) {
    console.warn('verifyRemotePaymentStatus notice:', error?.message || error);
  }
  return { paid: false, payment: null };
};
