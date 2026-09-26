'use strict';

const { ethers } = require('ethers');
const { hashLandRecord, generateDataHash, verifyDataHash } = require('./landHasher');

// -------------------------------------------------------------
// LandVerification Contract ABI (Human-Readable)
// -------------------------------------------------------------
const LAND_VERIFICATION_ABI = [
  'function owner() external view returns (address)',
  'function totalVerifications() external view returns (uint256)',
  'function isOperator(address account) external view returns (bool)',
  'function setOperator(address operator, bool status) external',
  'function transferOwnership(address newOwner) external',
  'function registerLandData(bytes32 dataHash, string calldata propertyId, string calldata ipfsCid) external returns (uint256)',
  'function verifyLandData(bytes32 dataHash) external view returns (bool exists, bool isValid, uint256 verificationId, string propertyId, string ipfsCid, address registeredBy, uint256 timestamp)',
  'function verifyProperty(bytes32 dataHash, string calldata propertyId) external view returns (bool isValidMatch, uint256 verificationId, string ipfsCid, address registeredBy, uint256 timestamp)',
  'function getHashesByPropertyId(string calldata propertyId) external view returns (bytes32[])',
  'function getVerificationById(uint256 verificationId) external view returns (tuple(uint256 verificationId, bytes32 dataHash, string propertyId, string ipfsCid, address registeredBy, uint256 timestamp, bool isRevoked))',
  'function getVerificationByHash(bytes32 dataHash) external view returns (tuple(uint256 verificationId, bytes32 dataHash, string propertyId, string ipfsCid, address registeredBy, uint256 timestamp, bool isRevoked))',
  'function revokeVerification(uint256 verificationId, string calldata reason) external',
  'function revokeVerificationByHash(bytes32 dataHash, string calldata reason) external',
  'event LandRecordRegistered(uint256 indexed verificationId, bytes32 indexed dataHash, string propertyId, string ipfsCid, address indexed registeredBy, uint256 timestamp)',
  'event LandRecordRevoked(uint256 indexed verificationId, bytes32 indexed dataHash, address indexed revokedBy, string reason, uint256 timestamp)',
  'event OperatorStatusChanged(address indexed operator, bool indexed status)',
  'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
  'error Unauthorized(address caller)',
  'error DuplicateVerification(bytes32 dataHash)',
  'error RecordNotFound(bytes32 dataHash)',
  'error RecordNotFoundById(uint256 verificationId)',
  'error VerificationRevoked(bytes32 dataHash)',
  'error InvalidDataHash()',
  'error InvalidPropertyId()',
  'error ZeroAddress()'
];

class BlockchainService {
  constructor() {
    this.abi = LAND_VERIFICATION_ABI;
  }

  /**
   * Retrieves active runtime configuration from process.env.
   */
  getConfig() {
    const chainId = Number(process.env.BSC_CHAIN_ID || 97);
    const rpcUrl = process.env.BSC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/';
    const contractAddress =
      process.env.LAND_VERIFICATION_CONTRACT_ADDRESS ||
      process.env.BSC_LAND_REGISTRY_ADDRESS ||
      '';
    const privateKey =
      process.env.OPERATOR_PRIVATE_KEY ||
      process.env.BSC_RELAYER_PRIVATE_KEY ||
      process.env.PRIVATE_KEY ||
      '';
    const explorerUrl =
      process.env.BSC_EXPLORER_TX_URL ||
      (chainId === 56 ? 'https://bscscan.com/tx/' : 'https://testnet.bscscan.com/tx/');

    return {
      rpcUrl,
      chainId,
      contractAddress,
      privateKey,
      explorerUrl,
      isConfigured: Boolean(
        contractAddress &&
          ethers.isAddress(contractAddress) &&
          privateKey &&
          privateKey.trim().length >= 64
      ),
    };
  }

  /**
   * Returns an ethers JsonRpcProvider instance.
   */
  getProvider() {
    const config = this.getConfig();
    return new ethers.JsonRpcProvider(config.rpcUrl, config.chainId);
  }

  /**
   * Returns the backend operator wallet with signing capability.
   */
  getOperatorWallet() {
    const config = this.getConfig();
    if (!config.privateKey) {
      throw new Error('OPERATOR_PRIVATE_KEY is missing on backend.');
    }
    const formattedKey = config.privateKey.startsWith('0x')
      ? config.privateKey
      : `0x${config.privateKey}`;
    return new ethers.Wallet(formattedKey, this.getProvider());
  }

  /**
   * Returns a contract instance connected to the provider or operator wallet.
   * @param {boolean} withSigner
   */
  getContract(withSigner = false) {
    const config = this.getConfig();
    if (!config.contractAddress || !ethers.isAddress(config.contractAddress)) {
      throw new Error(
        `LAND_VERIFICATION_CONTRACT_ADDRESS is invalid or missing (${config.contractAddress}).`
      );
    }

    const runner = withSigner ? this.getOperatorWallet() : this.getProvider();
    return new ethers.Contract(config.contractAddress, this.abi, runner);
  }

  /**
   * Checks connection health and balance of operator.
   */
  async getBlockchainStatus() {
    const config = this.getConfig();
    const result = {
      configured: config.isConfigured,
      rpcUrl: config.rpcUrl,
      chainId: config.chainId,
      network: config.chainId === 56 ? 'BSC Mainnet' : 'BSC Testnet',
      contractAddress: config.contractAddress || 'Not Configured',
      operatorAddress: null,
      operatorBalanceBNB: null,
      isOperatorAuthorized: false,
      totalVerifications: 0,
      rpcConnected: false,
      error: null,
    };

    try {
      const provider = this.getProvider();
      const network = await provider.getNetwork();
      result.rpcConnected = Boolean(network);

      if (config.privateKey) {
        const wallet = this.getOperatorWallet();
        result.operatorAddress = wallet.address;
        const balance = await provider.getBalance(wallet.address);
        result.operatorBalanceBNB = ethers.formatEther(balance);
      }

      if (config.contractAddress && ethers.isAddress(config.contractAddress)) {
        const contract = this.getContract(false);
        try {
          const total = await contract.totalVerifications();
          result.totalVerifications = Number(total);

          if (result.operatorAddress) {
            result.isOperatorAuthorized = await contract.isOperator(result.operatorAddress);
          }
        } catch (contractErr) {
          result.error = `Contract query failed: ${contractErr.message}`;
        }
      }
    } catch (err) {
      result.error = err.message;
    }

    return result;
  }

  /**
   * Registers a land record verification on BNB Smart Chain.
   *
   * @param {Object|string} landRecord Land record payload (auto-hashed) or pre-calculated bytes32 hex hash.
   * @param {string} propertyId Official registration / survey identifier.
   * @param {string} ipfsCid Optional IPFS CID containing documents or encrypted data.
   * @returns {Promise<Object>}
   */
  async registerOnBlockchain(landRecord, propertyId = '', ipfsCid = '') {
    const config = this.getConfig();
    if (!config.isConfigured) {
      throw Object.assign(
        new Error(
          'Blockchain service is not configured. Please ensure LAND_VERIFICATION_CONTRACT_ADDRESS and OPERATOR_PRIVATE_KEY are set in .env'
        ),
        { statusCode: 503 }
      );
    }

    // Determine dataHash and canonical record
    let dataHash;
    let canonicalJson = '';
    let normalizedRecord = null;

    if (typeof landRecord === 'string' && landRecord.startsWith('0x') && landRecord.length === 66) {
      dataHash = landRecord;
    } else {
      const hashResult = hashLandRecord(landRecord);
      dataHash = hashResult.dataHash;
      canonicalJson = hashResult.canonicalJson;
      normalizedRecord = hashResult.normalizedRecord;
    }

    // Property ID fallback from record if not passed
    const finalPropertyId = String(
      propertyId ||
        normalizedRecord?.registrationNumber ||
        normalizedRecord?.surveyNo ||
        normalizedRecord?.khasraNo ||
        ''
    ).trim();

    const finalIpfsCid = String(ipfsCid || normalizedRecord?.ipfsCid || '').trim();

    const contract = this.getContract(true);
    const wallet = this.getOperatorWallet();

    console.log(`[BLOCKCHAIN] Submitting verification for dataHash: ${dataHash} (Property: ${finalPropertyId})`);

    let tx;
    try {
      tx = await contract.registerLandData(dataHash, finalPropertyId, finalIpfsCid);
    } catch (err) {
      // Decode custom contract errors
      if (err.data) {
        try {
          const decodedError = contract.interface.parseError(err.data);
          if (decodedError?.name === 'DuplicateVerification') {
            throw Object.assign(
              new Error(`This land record hash (${dataHash}) is already registered on BNB Smart Chain.`),
              { statusCode: 409, code: 'DUPLICATE_VERIFICATION', dataHash }
            );
          }
          if (decodedError?.name === 'Unauthorized') {
            throw Object.assign(
              new Error(`Operator wallet (${wallet.address}) is not authorized on contract.`),
              { statusCode: 403, code: 'UNAUTHORIZED_OPERATOR' }
            );
          }
        } catch {}
      }
      throw err;
    }

    const receipt = await tx.wait();

    // Parse LandRecordRegistered event
    let verificationId = null;
    let timestamp = Math.floor(Date.now() / 1000);

    for (const log of receipt.logs || []) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === 'LandRecordRegistered') {
          verificationId = Number(parsed.args.verificationId);
          timestamp = Number(parsed.args.timestamp);
          break;
        }
      } catch {}
    }

    return {
      success: true,
      network: config.chainId === 56 ? 'bsc-mainnet' : 'bsc-testnet',
      chainId: config.chainId,
      contractAddress: config.contractAddress,
      operatorAddress: wallet.address,
      transactionHash: tx.hash,
      explorerUrl: `${config.explorerUrl}${tx.hash}`,
      verificationId,
      dataHash,
      propertyId: finalPropertyId,
      ipfsCid: finalIpfsCid,
      timestamp,
      blockNumber: Number(receipt.blockNumber),
      gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : null,
      canonicalJson,
    };
  }

  /**
   * Queries BSC smart contract to verify if a land record hash exists and is valid.
   *
   * @param {Object|string} landRecordOrHash Land record payload or bytes32 data hash
   * @returns {Promise<Object>}
   */
  async verifyOnBlockchain(landRecordOrHash) {
    const config = this.getConfig();
    if (!config.contractAddress || !ethers.isAddress(config.contractAddress)) {
      throw Object.assign(
        new Error('LAND_VERIFICATION_CONTRACT_ADDRESS is missing or invalid on backend.'),
        { statusCode: 500 }
      );
    }

    let dataHash;
    if (
      typeof landRecordOrHash === 'string' &&
      landRecordOrHash.startsWith('0x') &&
      landRecordOrHash.length === 66
    ) {
      dataHash = landRecordOrHash;
    } else {
      dataHash = generateDataHash(landRecordOrHash);
    }

    const contract = this.getContract(false);
    const result = await contract.verifyLandData(dataHash);

    const exists = Boolean(result[0]);
    const isValid = Boolean(result[1]);
    const verificationId = Number(result[2]);
    const propertyId = String(result[3]);
    const ipfsCid = String(result[4]);
    const registeredBy = String(result[5]);
    const timestamp = Number(result[6]);

    return {
      success: true,
      exists,
      isValid,
      isRevoked: exists && !isValid,
      verificationId: exists ? verificationId : null,
      dataHash,
      propertyId,
      ipfsCid,
      registeredBy: exists ? registeredBy : null,
      timestamp: exists ? timestamp : null,
      registeredDate: exists && timestamp > 0 ? new Date(timestamp * 1000).toISOString() : null,
      contractAddress: config.contractAddress,
      network: config.chainId === 56 ? 'bsc-mainnet' : 'bsc-testnet',
      chainId: config.chainId,
    };
  }

  /**
   * Verifies that a record hash matches a specific property identifier on-chain.
   *
   * @param {Object|string} landRecordOrHash
   * @param {string} propertyId
   */
  async verifyPropertyOnBlockchain(landRecordOrHash, propertyId) {
    if (!propertyId || typeof propertyId !== 'string') {
      throw Object.assign(new Error('propertyId is required for property verification.'), {
        statusCode: 400,
      });
    }

    let dataHash;
    if (
      typeof landRecordOrHash === 'string' &&
      landRecordOrHash.startsWith('0x') &&
      landRecordOrHash.length === 66
    ) {
      dataHash = landRecordOrHash;
    } else {
      dataHash = generateDataHash(landRecordOrHash);
    }

    const contract = this.getContract(false);
    const result = await contract.verifyProperty(dataHash, propertyId);

    const isValidMatch = Boolean(result[0]);
    const verificationId = Number(result[1]);
    const ipfsCid = String(result[2]);
    const registeredBy = String(result[3]);
    const timestamp = Number(result[4]);

    return {
      success: true,
      isValidMatch,
      dataHash,
      propertyId,
      verificationId: isValidMatch ? verificationId : null,
      ipfsCid: isValidMatch ? ipfsCid : null,
      registeredBy: isValidMatch ? registeredBy : null,
      timestamp: isValidMatch ? timestamp : null,
      registeredDate:
        isValidMatch && timestamp > 0 ? new Date(timestamp * 1000).toISOString() : null,
    };
  }

  /**
   * Revokes a land verification on-chain.
   *
   * @param {Object} params { verificationId, dataHash, reason }
   */
  async revokeOnBlockchain({ verificationId, dataHash, reason = '' }) {
    const config = this.getConfig();
    if (!config.isConfigured) {
      throw Object.assign(new Error('Blockchain service is not configured for signing.'), {
        statusCode: 503,
      });
    }

    const contract = this.getContract(true);
    let tx;

    if (verificationId) {
      tx = await contract.revokeVerification(verificationId, String(reason || 'Revoked by authority'));
    } else if (dataHash) {
      tx = await contract.revokeVerificationByHash(dataHash, String(reason || 'Revoked by authority'));
    } else {
      throw Object.assign(
        new Error('Either verificationId or dataHash must be provided to revoke a verification.'),
        { statusCode: 400 }
      );
    }

    const receipt = await tx.wait();

    return {
      success: true,
      transactionHash: tx.hash,
      explorerUrl: `${config.explorerUrl}${tx.hash}`,
      blockNumber: Number(receipt.blockNumber),
      revoked: true,
      reason,
    };
  }
}

const blockchainService = new BlockchainService();

module.exports = {
  BlockchainService,
  blockchainService,
  LAND_VERIFICATION_ABI,
};
