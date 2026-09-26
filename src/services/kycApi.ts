import { trustledgeBackendConfig } from './kycConfig';

const CONSENT_PURPOSE = 'Customer onboarding and KYC verification';


export interface PanVerificationResult {
  panNo: string;
  holderName: string;
  status: string;
  category?: string;
  referenceId?: string;
}

export interface DigiLockerSession {
  decentroTxnId: string;
  authorizationUrl: string;
  referenceId?: string;
}

export interface AadhaarVerificationResult {
  aadhaarNo: string;
  name: string;
  dob?: string;
  gender?: string;
  photo?: string;
  address?: string;
  careOf?: string;
  district?: string;
  subDistrict?: string;
  village?: string;
  state?: string;
  pincode?: string;
  referenceId?: string;
}

class KycApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'KycApiError';
    this.status = status;
  }
}

export const createReferenceId = (prefix: string) => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
};

const executeKycBackendRequest = async (endpoint: string, options: any = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const url = `${trustledgeBackendConfig.baseUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
    const headers = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method: options.method || 'POST',
      signal: controller.signal,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      throw new KycApiError(
        getDecentroMessage(data, `KYC request failed with status ${response.status}`),
        response.status
      );
    }

    if (data?.status === 'FAILURE' || data?.status === 'UNAUTHORIZED') {
      throw new KycApiError(getDecentroMessage(data, `KYC provider returned ${data.status}`));
    }

    return data;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new KycApiError('KYC service did not respond in time. Please try again.');
    }
    if (err instanceof KycApiError) {
      throw err;
    }
    throw new KycApiError(err?.message || 'Unable to connect to KYC service.');
  } finally {
    clearTimeout(timeoutId);
  }
};

const formatValue = (value: any): string => {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const stripHtml = (value: string): string =>
  value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getDecentroMessage = (data: any, fallback: string) =>
  (() => {
    const responseCode = data?.responseCode || data?.response_code || data?.data?.responseCode;
    if (responseCode === 'E00021') {
      return 'No PAN record was found for this PAN number. Please check the PAN and try again.';
    }
    if (responseCode === 'E00008') {
      return 'Decentro authentication failed. Please verify the backend Client ID and Client Secret.';
    }
    if (responseCode === 'E00031') {
      return 'DigiLocker is not enabled for this Decentro account. Please subscribe/activate the DigiLocker module in Decentro.';
    }

    const rawMessage =
      data?.message ||
      data?.error ||
      data?.errorMessage ||
      data?.responseMessage ||
      data?.response_message ||
      data?.description ||
      data?.details ||
      data?.errors ||
      data?.data?.message ||
      data?.data?.error ||
      data?.response?.message;

    if (typeof rawMessage === 'string') {
      if (/<\/?[a-z][\s\S]*>/i.test(rawMessage)) {
        const cleanMessage = stripHtml(rawMessage);
        if (/403 Forbidden/i.test(cleanMessage)) {
          return 'KYC provider rejected the request with 403 Forbidden. Please check Decentro credentials, environment, module access, or IP/domain allowlisting.';
        }
        return cleanMessage || fallback;
      }

      try {
        const parsed = JSON.parse(rawMessage);
        const parsedCode = parsed?.responseCode || parsed?.response_code;
        if (parsedCode === 'E00021') {
          return 'No PAN record was found for this PAN number. Please check the PAN and try again.';
        }
        if (parsedCode === 'E00008') {
          return 'Decentro authentication failed. Please verify the backend Client ID and Client Secret.';
        }
        if (parsedCode === 'E00031') {
          return 'DigiLocker is not enabled for this Decentro account. Please subscribe/activate the DigiLocker module in Decentro.';
        }
        return formatValue(parsed?.message || parsed?.error || parsed?.details || rawMessage);
      } catch {
        return rawMessage || fallback;
      }
    }

    return formatValue(rawMessage) || fallback;
  })();


const pickFirstString = (...args: any[]): string =>
  args.find((arg) => typeof arg === 'string' && arg.trim().length > 0)?.trim() || '';

const parseAadhaarXml = (data: any) => {
  const xml = getAadhaarSource(data)?.xml || getAadhaarSource(data)?.xmlData || '';
  if (!xml) return null;

  try {
    const extractTagAttr = (xmlStr: string, tagName: string, attrName: string): string => {
      const match = xmlStr.match(new RegExp(`<${tagName}\\b([^>]*)`, 'i'));
      if (!match?.[1]) return '';
      const attrMatch = match[1].match(new RegExp(`${attrName}\\s*=\\s*"([^"]*)"`, 'i'));
      return attrMatch?.[1] || '';
    };

    const extractTagValue = (xmlStr: string, tagName: string): string => {
      const match = xmlStr.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\/${tagName}>`, 'i'));
      return match?.[1]?.trim() || '';
    };

    const name = extractTagAttr(xml, 'Poi', 'name') || extractTagAttr(xml, 'UidData', 'name');
    const dob = extractTagAttr(xml, 'Poi', 'dob') || extractTagAttr(xml, 'Poi', 'yob');
    const gender = extractTagAttr(xml, 'Poi', 'gender');
    const photo = extractTagValue(xml, 'Pht');
    const uid = extractTagAttr(xml, 'UidData', 'uid');

    const address = {
      house: extractTagAttr(xml, 'Poa', 'house'),
      street: extractTagAttr(xml, 'Poa', 'street'),
      landmark: extractTagAttr(xml, 'Poa', 'lm') || extractTagAttr(xml, 'Poa', 'landmark'),
      locality: extractTagAttr(xml, 'Poa', 'loc'),
      village: extractTagAttr(xml, 'Poa', 'vtc'),
      subDistrict: extractTagAttr(xml, 'Poa', 'subdist'),
      district: extractTagAttr(xml, 'Poa', 'dist') || extractTagAttr(xml, 'Poa', 'district'),
      state: extractTagAttr(xml, 'Poa', 'state'),
      country: extractTagAttr(xml, 'Poa', 'country'),
      pincode: extractTagAttr(xml, 'Poa', 'pc') || extractTagAttr(xml, 'Poa', 'pincode'),
      careOf: extractTagAttr(xml, 'Poa', 'co'),
    };

    if (name || Object.keys(address).some((key) => address[key as keyof typeof address])) {
      return {
        aadhaarNo: uid,
        name,
        dob,
        gender,
        photo,
        address,
        xml,
      };
    }
  } catch (err) {
    console.warn('Failed parsing Aadhaar XML:', err);
  }

  return null;
};

const flattenAddress = (addr: any): string => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;

  const house = pickFirstString(addr.house, addr.houseNumber, addr.houseNo, addr.hNo);
  const street = pickFirstString(addr.street, addr.streetAddress);
  const landmark = pickFirstString(addr.landmark, addr.lm);
  const locality = pickFirstString(addr.locality, addr.loc);
  const village = pickFirstString(addr.village, addr.vtc, addr.villageTownCity);
  const subDistrict = pickFirstString(addr.subDistrict, addr.subdist);
  const district = pickFirstString(addr.district, addr.dist, addr.city);
  const state = pickFirstString(addr.state);
  const country = pickFirstString(addr.country);
  const pincode = pickFirstString(addr.pincode, addr.pinCode, addr.pc, addr.pin);

  const parts = [
    house,
    street,
    landmark,
    locality,
    village,
    subDistrict,
    district,
    state,
    country,
    pincode,
  ];

  return parts.filter(Boolean).join(', ');
};

const getAadhaarSource = (data: any) =>
  data.aadhaar ||
  data.eaadhaar ||
  data.kycResult ||
  data.result ||
  data.data?.aadhaar ||
  data.data?.eaadhaar ||
  data.data?.kycResult ||
  data.data?.result ||
  data.data ||
  data;

const getNested = (source: any, path: string) =>
  path.split('.').reduce((value, key) => value?.[key], source);

export const verifyPan = async (panNumber: string): Promise<PanVerificationResult> => {
  const referenceId = createReferenceId('PAN');
  
  const data = await executeKycBackendRequest('/api/pan/verify', {
    body: {
      reference_id: referenceId,
      id_number: panNumber.toUpperCase(),
      consent_purpose: CONSENT_PURPOSE,
    },
  });

  const kycResult =
    data.kycResult ||
    data.data?.kycResult ||
    data.result ||
    data.data?.result ||
    data.response?.kycResult ||
    data.response ||
    data.data ||
    data;

  const status = pickFirstString(
    kycResult.idStatus,
    kycResult.id_status,
    kycResult.panStatus,
    kycResult.pan_status,
    data.idStatus,
    data.data?.idStatus,
  ) || (data.status === 'SUCCESS' ? 'VALID' : pickFirstString(kycResult.status, data.status));

  if (status === 'INVALID' || status === 'FAILURE') {
    throw new KycApiError(getDecentroMessage(data, 'PAN could not be verified. Please check the number and try again.'));
  }

  const panNo = pickFirstString(
    kycResult.idNumber,
    kycResult.id_number,
    kycResult.panNo,
    kycResult.pan,
    data.idNumber,
    data.data?.idNumber,
    panNumber,
  );
  const holderName = pickFirstString(
    kycResult.name,
    kycResult.holderName,
    kycResult.fullName,
    kycResult.full_name,
    data.name,
    data.data?.name,
  );

  if (!holderName) {
    throw new KycApiError(getDecentroMessage(data, 'PAN was verified, but Decentro did not return holder name.'));
  }

  return {
    panNo,
    holderName,
    status: status || 'VALID',
    category: pickFirstString(kycResult.category, kycResult.panCategory, kycResult.pan_category),
    referenceId: pickFirstString(data.reference_id, data.referenceId, kycResult.reference_id, kycResult.referenceId, referenceId),
  };
};

export const initiateDigiLocker = async (): Promise<DigiLockerSession> => {
  const referenceId = createReferenceId('AADHAAR_INIT');
  
  const data = await executeKycBackendRequest('/api/digilocker/initiate', {
    body: {
      reference_id: referenceId,
      consent_purpose: 'Customer KYC',
      redirect_to_signup: true,
      abstract_access_token: true,
    },
  });

  const authorizationUrl = data.authorizationUrl || data.data?.authorizationUrl;
  const decentroTxnId = data.decentroTxnId || data.data?.decentroTxnId;

  if (!authorizationUrl || !decentroTxnId) {
    throw new KycApiError('DigiLocker session did not return an authorization URL.');
  }

  return {
    decentroTxnId,
    authorizationUrl,
    referenceId: data.reference_id || data.referenceId || referenceId,
  };
};

export const exchangeDigiLockerCode = async (
  decentroTxnId: string,
  digilockerCode: string,
) => {
  const referenceId = createReferenceId('AADHAAR_TOKEN');
  
  return executeKycBackendRequest('/api/digilocker/token', {
    body: {
      reference_id: referenceId,
      consent_purpose: 'Customer KYC',
      initial_decentro_transaction_id: decentroTxnId,
      digilocker_code: digilockerCode,
    },
  });
};

export const downloadAadhaar = async (
  decentroTxnId: string,
): Promise<AadhaarVerificationResult> => {
  const referenceId = createReferenceId('AADHAAR');
  
  const data = await executeKycBackendRequest('/api/digilocker/aadhaar', {
    body: {
      decentroTxnId,
      reference_id: referenceId,
      purpose: 'Customer KYC',
      generate_pdf: true,
      generate_xml: true,
    },
  });

  console.log('[DEBUG] downloadAadhaar raw Decentro response keys:', Object.keys(data));
  console.log('[DEBUG] downloadAadhaar response data preview:', JSON.stringify(data).substring(0, 1000));

  const aadhaar = getAadhaarSource(data);
  const xmlAadhaar = parseAadhaarXml(data);
  const xmlAddress = xmlAadhaar?.address;

  const proofOfIdentity = data.data?.proofOfIdentity || data.data?.poi || aadhaar?.proofOfIdentity || {};
  const proofOfAddress = data.data?.proofOfAddress || data.data?.poa || aadhaar?.proofOfAddress || {};

  const aadhaarNo = pickFirstString(
    data.data?.aadhaarUid,
    data.data?.aadhaarNumber,
    data.data?.maskedAadhaar,
    aadhaar.aadhaarNumber,
    aadhaar.aadhaarNo,
    aadhaar.uid,
    getNested(data, 'data.aadhaarNumber'),
    getNested(data, 'data.maskedAadhaarNumber'),
    xmlAadhaar?.aadhaarNo,
  );
  
  const name = pickFirstString(
    proofOfIdentity.name,
    proofOfIdentity.fullName,
    aadhaar.name,
    aadhaar.fullName,
    aadhaar.holderName,
    aadhaar.nameFromAadhaar,
    data.name,
    data.data?.name,
    data.data?.fullName,
    data.data?.kycResult?.name,
    xmlAadhaar?.name
  );

  if (!name) {
    console.error('Decentro response did not contain a name. Full payload:', JSON.stringify(data));
    throw new KycApiError(
      `Aadhaar downloaded, but no readable name was found. Response keys: ${Object.keys(data).join(', ')} | Data keys: ${data.data ? Object.keys(data.data).join(', ') : 'null'} | Aadhaar keys: ${aadhaar ? Object.keys(aadhaar).join(', ') : 'null'}`
    );
  }

  const addressSource =
    proofOfAddress ||
    aadhaar?.address ||
    aadhaar?.addressDetails ||
    aadhaar?.splitAddress ||
    data?.address ||
    data?.addressDetails ||
    data?.splitAddress ||
    data.data?.address ||
    data.data?.addressDetails ||
    data.data?.splitAddress ||
    xmlAddress;

  const finalAddress =
    flattenAddress(addressSource) ||
    flattenAddress(aadhaar) ||
    flattenAddress(data.data) ||
    flattenAddress(xmlAddress);

  return {
    aadhaarNo,
    name,
    dob: pickFirstString(proofOfIdentity.dob, proofOfIdentity.dateOfBirth, aadhaar.dob, aadhaar.dateOfBirth, aadhaar.birthDate, xmlAadhaar?.dob),
    gender: pickFirstString(proofOfIdentity.gender, aadhaar.gender, xmlAadhaar?.gender),
    photo: pickFirstString(data.data?.image, data.data?.photo, aadhaar.photo, aadhaar.image, xmlAadhaar?.photo),
    address: finalAddress,
    careOf: pickFirstString(proofOfAddress.careOf, addressSource?.careOf, aadhaar.careOf, xmlAddress?.careOf),
    district: pickFirstString(proofOfAddress.district, addressSource?.district, addressSource?.dist, aadhaar.district, xmlAddress?.district),
    subDistrict: pickFirstString(proofOfAddress.subDistrict, addressSource?.subDistrict, addressSource?.subdist, aadhaar.subDistrict, xmlAddress?.subDistrict),
    village: pickFirstString(proofOfAddress.vtc, proofOfAddress.village, addressSource?.village, addressSource?.vtc, aadhaar.village, xmlAddress?.village),
    state: pickFirstString(proofOfAddress.state, addressSource?.state, aadhaar.state, xmlAddress?.state),
    pincode: pickFirstString(proofOfAddress.pincode, addressSource?.pincode, addressSource?.pinCode, aadhaar.pincode, xmlAddress?.pincode),
    referenceId: data.reference_id || data.referenceId || referenceId,
  };
};

export interface MeonTokenResponse {
  clientToken: string;
  state: string;
}

export interface MeonDigiUrlResponse {
  url: string;
  token?: string;
  state?: string;
}

export interface MeonFetchResult {
  name?: string;
  aadhaarNo?: string;
  dob?: string;
  gender?: string;
  address?: string;
  fatherName?: string;
  house?: string;
  locality?: string;
  district?: string;
  state?: string;
  pincode?: string;
  panNumber?: string;
  nameOnPan?: string;
  panImagePath?: string;
  raw: any;
}

export const getMeonToken = async (): Promise<MeonTokenResponse> => {
  const data = await executeKycBackendRequest('/api/meon/token', {
    body: {},
  });

  const clientToken = data.clientToken || data.client_token || data.token;
  const state = data.state || data.token;

  if (!clientToken || !state) {
    throw new KycApiError('Meon did not return a client token or state.');
  }

  return { clientToken, state };
};

export const generateMeonDigiUrl = async (
  clientToken?: string,
  options: { panName?: string; panNo?: string; documents?: string; redirectUrl?: string } = {},
): Promise<MeonDigiUrlResponse> => {
  const data = await executeKycBackendRequest('/api/meon/digi-url', {
    body: {
      client_token: clientToken || '',
      token: clientToken || '',
      documents: options.documents || 'aadhaar,pan',
      pan_name: options.panName || '',
      panName: options.panName || '',
      pan_no: options.panNo || '',
      panNo: options.panNo || '',
      redirect_url: options.redirectUrl,
    },
  });

  const url = data.url || data.digiUrl || data.digi_url || data.data?.url || data.data?.digiUrl;
  const token = data.token || data.client_token || data.clientToken || data.state || data.data?.token;
  const state = data.state || data.token || data.client_token;

  if (!url) {
    throw new KycApiError('Meon did not return a DigiLocker authorization URL.');
  }

  return { url, token, state };
};

export const fetchMeonData = async (
  clientToken: string,
  state?: string,
): Promise<MeonFetchResult> => {
  const finalState = state || clientToken;
  const finalClientToken = clientToken || state;

  const data = await executeKycBackendRequest('/api/meon/fetch-data', {
    body: {
      client_token: finalClientToken,
      state: finalState,
      token: finalState,
      status: true,
    },
  });

  console.log('[DEBUG] fetchMeonData raw response:', JSON.stringify(data || {}).substring(0, 1500));

  if (!data) {
    throw new KycApiError('No verification payload returned by DigiLocker.');
  }

  const payload = (data && data.data) ? data.data : (data || {});
  const aadharObj = payload.aadhaar_data || payload.aadhar_data || payload.aadhaar || payload.aadhar || payload;
  const panObj = payload.pan_data || payload.panData || payload.pan || payload;

  const name = pickFirstString(
    aadharObj.name,
    aadharObj.fullName,
    aadharObj.holderName,
    panObj.name,
    panObj.holderName,
    payload.name,
    payload.fullName,
    payload.holderName,
  );

  const aadhaarNo = pickFirstString(
    aadharObj.aadhar_no,
    aadharObj.aadhaarNo,
    aadharObj.aadharNo,
    aadharObj.uid,
    aadharObj.aadhaarNumber,
    aadharObj.aadhaar_number,
    aadharObj.masked_aadhaar_number,
    payload.aadhar_no,
    payload.aadhaarNo,
    payload.aadharNo,
    payload.uid,
    payload.aadhaarNumber,
  );

  const dob = pickFirstString(
    aadharObj.dob,
    aadharObj.dateOfBirth,
    aadharObj.birthDate,
    panObj.dob,
    panObj.dateOfBirth,
    payload.dob,
    payload.dateOfBirth,
    payload.birthDate,
  );

  const gender = pickFirstString(aadharObj.gender, payload.gender);
  const fatherName = pickFirstString(
    aadharObj.fathername,
    aadharObj.fatherName,
    aadharObj.care_of,
    aadharObj.careOf,
    panObj.father_name,
    panObj.fatherName,
    payload.fathername,
    payload.fatherName,
  );

  const house = pickFirstString(aadharObj.house, aadharObj.houseNo, payload.house, payload.houseNo);
  const locality = pickFirstString(aadharObj.locality, aadharObj.loc, aadharObj.street, payload.locality, payload.loc);
  const district = pickFirstString(aadharObj.dist, aadharObj.district, aadharObj.vtc, payload.dist, payload.district);
  const stateName = pickFirstString(aadharObj.state, payload.state);
  const pincode = pickFirstString(aadharObj.pincode, aadharObj.pinCode, aadharObj.pc, payload.pincode, payload.pinCode);

  const address = pickFirstString(
    aadharObj.aadhar_address,
    aadharObj.address,
    aadharObj.combined_address,
    aadharObj.full_address,
    payload.aadhar_address,
    payload.address,
  ) || [house, locality, district, stateName, pincode].filter(Boolean).join(', ');

  const panNumber = pickFirstString(
    panObj.pan_number,
    panObj.panNumber,
    panObj.pan_no,
    panObj.panNo,
    panObj.pan,
    payload.pan_number,
    payload.panNumber,
    payload.pan_no,
  );

  const nameOnPan = pickFirstString(
    panObj.name_on_pan,
    panObj.nameOnPan,
    panObj.holder_name,
    panObj.holderName,
    panObj.name,
    payload.name_on_pan,
    payload.nameOnPan,
    name,
  );

  const panImagePath = pickFirstString(
    panObj.pan_image_path,
    panObj.panImagePath,
    panObj.pan_image,
    payload.pan_image_path,
    payload.panImagePath,
  );

  return {
    name,
    aadhaarNo,
    dob,
    gender,
    address,
    fatherName,
    house,
    locality,
    district,
    state: stateName,
    pincode,
    panNumber,
    nameOnPan,
    panImagePath,
    raw: data,
  };
};
