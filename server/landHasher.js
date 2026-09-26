'use strict';

const { createHash } = require('crypto');

/**
 * Normalizes a string by trimming extra whitespace and stripping non-printable characters.
 * @param {*} value
 * @returns {string}
 */
function normalizeString(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

/**
 * Recursively canonicalizes an arbitrary JavaScript object or array
 * by sorting all object keys in lexicographical order.
 * Ensures consistent serialization regardless of property insertion order.
 *
 * @param {*} value
 * @returns {string} Deterministic JSON string
 */
function canonicalizeJson(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const canonicalArray = value.map((item) =>
      item === undefined ? null : JSON.parse(canonicalizeJson(item))
    );
    return JSON.stringify(canonicalArray);
  }

  const sortedKeys = Object.keys(value).sort();
  const canonicalObj = {};

  for (const key of sortedKeys) {
    const val = value[key];
    if (val !== undefined && typeof val !== 'function' && typeof val !== 'symbol') {
      canonicalObj[key] = JSON.parse(canonicalizeJson(val));
    }
  }

  return JSON.stringify(canonicalObj);
}

/**
 * Sanitizes and normalizes standard land record fields before hashing.
 *
 * @param {Object} rawRecord
 * @returns {Object} Normalized record object
 */
function normalizeLandRecord(rawRecord = {}) {
  if (!rawRecord || typeof rawRecord !== 'object') {
    return {};
  }

  const normalized = {};

  // Standard Land Record Fields
  if (rawRecord.ownerName !== undefined) {
    normalized.ownerName = normalizeString(rawRecord.ownerName);
  }
  if (rawRecord.state !== undefined) {
    normalized.state = normalizeString(rawRecord.state).toLowerCase();
  }
  if (rawRecord.district !== undefined) {
    normalized.district = normalizeString(rawRecord.district);
  }
  if (rawRecord.tehsil !== undefined || rawRecord.subRegistrarOffice !== undefined) {
    normalized.tehsil = normalizeString(rawRecord.tehsil || rawRecord.subRegistrarOffice);
  }
  if (rawRecord.village !== undefined) {
    normalized.village = normalizeString(rawRecord.village);
  }
  if (rawRecord.registrationNumber !== undefined) {
    normalized.registrationNumber = normalizeString(rawRecord.registrationNumber);
  }
  if (rawRecord.surveyNo !== undefined) {
    normalized.surveyNo = normalizeString(rawRecord.surveyNo);
  }
  if (rawRecord.khasraNo !== undefined) {
    normalized.khasraNo = normalizeString(rawRecord.khasraNo);
  }
  if (rawRecord.khewatNo !== undefined) {
    normalized.khewatNo = normalizeString(rawRecord.khewatNo);
  }
  if (rawRecord.area !== undefined) {
    normalized.area = normalizeString(rawRecord.area);
  }
  if (rawRecord.registrationDate !== undefined) {
    normalized.registrationDate = normalizeString(rawRecord.registrationDate);
  }
  if (rawRecord.documentReference !== undefined) {
    normalized.documentReference = normalizeString(rawRecord.documentReference);
  }

  // Preserve any additional custom / portal attributes deterministically
  for (const [key, val] of Object.entries(rawRecord)) {
    if (normalized[key] === undefined && val !== undefined && typeof val !== 'function') {
      normalized[key] = typeof val === 'string' ? normalizeString(val) : val;
    }
  }

  return normalized;
}

/**
 * Computes a deterministic SHA-256 hash in Ethereum `bytes32` (0x-prefixed hex) format.
 *
 * @param {Object|string} data Record object or JSON string
 * @returns {string} `0x`-prefixed 64-character hex string
 */
function generateDataHash(data) {
  let canonicalString;

  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      const normalized = typeof parsed === 'object' && parsed !== null ? normalizeLandRecord(parsed) : parsed;
      canonicalString = canonicalizeJson(normalized);
    } catch {
      canonicalString = data.trim();
    }
  } else if (typeof data === 'object' && data !== null) {
    const normalized = normalizeLandRecord(data);
    canonicalString = canonicalizeJson(normalized);
  } else {
    canonicalString = canonicalizeJson(data);
  }

  const hashHex = createHash('sha256').update(canonicalString, 'utf8').digest('hex');
  return `0x${hashHex}`;
}

/**
 * Complete land record hashing pipeline.
 * Normalizes, canonicalizes, and generates the cryptographic `bytes32` hash.
 *
 * @param {Object} landRecord Raw land record payload
 * @returns {{ dataHash: string, canonicalJson: string, normalizedRecord: Object }}
 */
function hashLandRecord(landRecord) {
  const normalizedRecord = typeof landRecord === 'object' && landRecord !== null
    ? normalizeLandRecord(landRecord)
    : landRecord;
  const canonicalJson = canonicalizeJson(normalizedRecord);
  const dataHash = `0x${createHash('sha256').update(canonicalJson, 'utf8').digest('hex')}`;

  return {
    dataHash,
    canonicalJson,
    normalizedRecord,
  };
}

/**
 * Verifies if a given land record reproduces the expected cryptographic hash.
 *
 * @param {Object|string} data
 * @param {string} expectedHash
 * @returns {boolean}
 */
function verifyDataHash(data, expectedHash) {
  if (!expectedHash || typeof expectedHash !== 'string') return false;
  const normalizedExpected = expectedHash.startsWith('0x')
    ? expectedHash.toLowerCase()
    : `0x${expectedHash.toLowerCase()}`;

  const computed = generateDataHash(data).toLowerCase();
  return computed === normalizedExpected;
}

module.exports = {
  canonicalizeJson,
  normalizeLandRecord,
  generateDataHash,
  hashLandRecord,
  verifyDataHash,
};
