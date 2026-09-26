'use strict';

const assert = require('assert');
const {
  canonicalizeJson,
  normalizeLandRecord,
  generateDataHash,
  hashLandRecord,
  verifyDataHash,
} = require('../server/landHasher');
const { blockchainService, LAND_VERIFICATION_ABI } = require('../server/blockchainService');

console.log('--- RUNNING BLOCKCHAIN & HASHER UNIT VERIFICATION TESTS ---');

// 1. Test Canonical JSON deterministic sorting
const obj1 = { z: 1, a: 2, m: { y: 10, x: 20 }, arr: [1, 2, 3] };
const obj2 = { arr: [1, 2, 3], m: { x: 20, y: 10 }, a: 2, z: 1 };

const canon1 = canonicalizeJson(obj1);
const canon2 = canonicalizeJson(obj2);
assert.strictEqual(canon1, canon2, 'Canonical JSON strings must match regardless of key order');
console.log('✓ Canonical JSON deterministic sorting passed');

// 2. Test Hash reproducibility
const hash1 = generateDataHash(obj1);
const hash2 = generateDataHash(obj2);
assert.strictEqual(hash1, hash2, 'Hash must be strictly identical for identical data structures');
assert.strictEqual(hash1.length, 66, 'Hash must be 0x-prefixed 32-byte hex string (66 chars)');
assert.strictEqual(hash1.startsWith('0x'), true, 'Hash must start with 0x');
console.log('✓ Cryptographic SHA-256 bytes32 hash passed:', hash1);

// 3. Test Land Record Normalization and Hashing Pipeline
const rawRecord1 = {
  ownerName: '  Ramesh  Kumar  ',
  state: 'Punjab',
  district: 'Amritsar',
  village: 'Kot Khalsa',
  registrationNumber: 'REG-2024-9981',
  khasraNo: '14//25',
  area: '2 Kanal',
};

const rawRecord2 = {
  village: 'Kot Khalsa',
  district: 'Amritsar',
  registrationNumber: 'REG-2024-9981',
  ownerName: 'Ramesh Kumar',
  area: '2 Kanal',
  khasraNo: '14//25',
  state: 'punjab',
};

const result1 = hashLandRecord(rawRecord1);
const result2 = hashLandRecord(rawRecord2);

assert.strictEqual(result1.dataHash, result2.dataHash, 'Normalized records must yield identical dataHash');
assert.strictEqual(verifyDataHash(rawRecord1, result1.dataHash), true, 'verifyDataHash must return true for matching record');
assert.strictEqual(verifyDataHash(rawRecord1, '0x1234'), false, 'verifyDataHash must return false for mismatch');
console.log('✓ Land record normalization and verification pipeline passed:', result1.dataHash);

// 4. Test BlockchainService methods & ABI definition
assert.ok(Array.isArray(LAND_VERIFICATION_ABI), 'LAND_VERIFICATION_ABI must be an array');
assert.ok(typeof blockchainService.registerOnBlockchain === 'function', 'registerOnBlockchain must be a function');
assert.ok(typeof blockchainService.verifyOnBlockchain === 'function', 'verifyOnBlockchain must be a function');
assert.ok(typeof blockchainService.verifyPropertyOnBlockchain === 'function', 'verifyPropertyOnBlockchain must be a function');
assert.ok(typeof blockchainService.revokeOnBlockchain === 'function', 'revokeOnBlockchain must be a function');
assert.ok(typeof blockchainService.getBlockchainStatus === 'function', 'getBlockchainStatus must be a function');

const config = blockchainService.getConfig();
console.log('✓ Blockchain Service configuration detected:', {
  chainId: config.chainId,
  rpcUrl: config.rpcUrl,
  isConfigured: config.isConfigured,
});

console.log('\n--- ALL BLOCKCHAIN UNIT VERIFICATION TESTS PASSED SUCCESSFULLY ---');
