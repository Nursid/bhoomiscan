# TrustLedge & BNB Smart Chain (BSC) Land Verification Guide

This guide documents the cryptographic land verification pipeline on **BNB Smart Chain (BSC)** using the `LandVerification.sol` smart contract and Node.js backend services.

---

## 1. Architecture Overview

```
                      +-----------------------------+
                      |   Official Land Record      |
                      |   (JSON / State Portal)     |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |   Canonical JSON Hasher     |
                      |   (server/landHasher.js)    |
                      |   SHA-256 -> bytes32 Hex    |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |   BSC Blockchain Service    |
                      | (server/blockchainService.js)|
                      +--------------+--------------+
                                     |
                      +--------------+--------------+
                      |                             |
                      v                             v
       +-------------------------------+   +-----------------------------+
       | registerLandData()            |   | verifyLandData()            |
       | (Signs Tx via Operator Wallet)|   | (Read-Only State Check)     |
       +---------------+---------------+   +--------------+--------------+
                       |                                  |
                       v                                  v
+-------------------------------------------------------------------------------+
|                      LandVerification.sol Smart Contract                      |
|                  Deployed on BNB Smart Chain (Testnet/Mainnet)                |
+-------------------------------------------------------------------------------+
```

---

## 2. Smart Contract: `LandVerification.sol`

Located at: `contracts/LandVerification.sol`

### Features
- **Solidity `^0.8.20`** with gas-optimized custom errors: `Unauthorized`, `DuplicateVerification`, `RecordNotFound`, `RecordNotFoundById`, `VerificationRevoked`, `InvalidDataHash`, `InvalidPropertyId`.
- **Duplicate Prevention**: Reverts if a hash was already registered.
- **Access Control**: Owner and authorized operator addresses can submit transactions (`onlyAuthorized`).
- **Cryptographic Storage**: Only stores `bytes32 dataHash`, `propertyId`, `ipfsCid`, `registeredBy`, and `timestamp`. Sensitive private land fields remain off-chain.
- **Revocation**: Operators can mark records as revoked in case of legal disputes or deed cancellations.

---

## 3. Backend Services & Utilities

### `server/landHasher.js`
- Deterministic recursive JSON canonicalizer (sorts keys alphabetically at all levels).
- Produces identical SHA-256 `bytes32` hashes regardless of key order.
- Normalizes land record fields (whitespace stripping, string trimming).

### `server/blockchainService.js`
- Built on `ethers.js` (v6).
- Interacts with BNB Smart Chain RPC endpoints.
- Methods:
  - `registerOnBlockchain(landRecord, propertyId, ipfsCid)`
  - `verifyOnBlockchain(landRecordOrHash)`
  - `verifyPropertyOnBlockchain(landRecordOrHash, propertyId)`
  - `revokeOnBlockchain({ verificationId, dataHash, reason })`
  - `getBlockchainStatus()`

---

## 4. REST API Endpoints (`server/kycServer.js`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/land/hash` | Deterministically canonicalizes and hashes a land record JSON. |
| `POST` | `/api/land/register-on-chain` | Hashes record and submits transaction to BSC smart contract. |
| `POST` | `/api/land/verify-on-chain` | Queries BSC contract to check if record hash exists and is valid. |
| `POST` | `/api/land/verify-property-on-chain` | Validates that a property ID matches the on-chain hash. |
| `POST` | `/api/land/revoke-on-chain` | Revokes an on-chain verification record (operator only). |
| `GET` | `/api/land/blockchain-status` | Returns live RPC connection, operator BNB balance, and contract info. |
| `GET` | `/health` | Health check with `landVerificationConfigured` status. |

---

## 5. Deployment to BSC Testnet

### Step 1: Fund Operator Wallet
Create or select an operator wallet and fund it with testnet BNB:
- BSC Testnet Faucet: [https://www.bnbchain.org/en/testnet-faucet](https://www.bnbchain.org/en/testnet-faucet)

### Step 2: Configure `.env`
```bash
BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
BSC_CHAIN_ID=97
BSC_EXPLORER_TX_URL=https://testnet.bscscan.com/tx/
OPERATOR_PRIVATE_KEY=0xYOUR_OPERATOR_PRIVATE_KEY
```

### Step 3: Deploy Smart Contract
```bash
npx hardhat run contracts/scripts/deployLandVerification.js --network bscTestnet
```

### Step 4: Save Contract Address
Copy the deployed contract address printed in the console and set it in `.env`:
```bash
LAND_VERIFICATION_CONTRACT_ADDRESS=0xDEPLOYED_CONTRACT_ADDRESS
```

---

## 6. Running Tests

```bash
# Run all unit and integration test suites
npx hardhat test

# Run hasher & backend verification
node scripts/testBlockchainIntegration.js
```
