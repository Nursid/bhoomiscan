import { trustledgeBackendConfig } from './kycConfig';

const USE_BSC_RELAYER = false;

export interface LandRecordData {
  ownerName: string;
  state: string;
  district: string;
  tehsil?: string;
  village: string;
  registrationNumber: string;
  surveyNo?: string;
  khewatNo?: string;
  area?: string;
  estimatedValuation?: string;
  subRegistrarOffice?: string;
  registrationDate?: string;
  documentReference?: string;
  manualNotes?: string;
}

export interface BlockchainTransactionResult {
  success: boolean;
  transactionHash?: string;
  recordId?: number | null;
  blockNumber?: number;
  chainId?: number;
  network?: string;
  contractAddress?: string;
  relayerAddress?: string;
  dataHash?: string;
  error?: string;
  explorerUrl?: string;
}

class BlockchainApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockchainApiError';
  }
}

const joinUrl = (baseUrl: string, path: string) =>
  `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

const formatError = (value: any) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const stableStringify = (value: any): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
};

const fnv1a64 = (value: string) => {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= BigInt(value.charCodeAt(i));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }

  return hash.toString(16).padStart(16, '0');
};

const createLocalLandHash = (landData: LandRecordData) => {
  const payload = {
    ownerName: landData.ownerName || '',
    state: landData.state || '',
    district: landData.district || '',
    tehsil: landData.tehsil || landData.subRegistrarOffice || '',
    village: landData.village || '',
    registrationNumber: landData.registrationNumber || '',
    surveyNo: landData.surveyNo || '',
    khewatNo: landData.khewatNo || '',
    area: landData.area || '',
    registrationDate: landData.registrationDate || '',
    documentReference: landData.documentReference || '',
    manualNotes: landData.manualNotes || '',
  };
  const source = stableStringify(payload);
  const hash = [
    fnv1a64(`trustledge-land-vault:0:${source}`),
    fnv1a64(`trustledge-land-vault:1:${source}`),
    fnv1a64(`trustledge-land-vault:2:${source}`),
    fnv1a64(`trustledge-land-vault:3:${source}`),
  ].join('');

  return `0x${hash}`;
};

class BlockchainService {
  async storeLandRecord(landData: LandRecordData): Promise<BlockchainTransactionResult> {
    if (!USE_BSC_RELAYER) {
      const hash = createLocalLandHash(landData);

      return {
        success: true,
        transactionHash: hash,
        dataHash: hash,
        network: 'local-hash',
        chainId: 0,
        recordId: null,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(joinUrl(trustledgeBackendConfig.baseUrl, '/api/blockchain/land-records'), {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName: landData.ownerName,
          state: landData.state,
          district: landData.district,
          tehsil: landData.tehsil || landData.subRegistrarOffice || '',
          village: landData.village,
          registrationNumber: landData.registrationNumber,
        }),
      });

      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { message: text };
      }

      if (!response.ok) {
        throw new BlockchainApiError(
          formatError(data?.message || data?.details) || 'Blockchain transaction failed.',
        );
      }

      return data as BlockchainTransactionResult;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return {
          success: false,
          error: 'BSC transaction is taking longer than expected. Please check backend logs or try again.',
        };
      }

      return {
        success: false,
        error:
          error instanceof BlockchainApiError
            ? error.message
            : 'Cannot reach TrustLedge backend for blockchain storage.',
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const blockchainService = new BlockchainService();
