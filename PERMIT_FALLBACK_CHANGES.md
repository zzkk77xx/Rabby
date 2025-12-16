# Permit Signature Fallback to Approve Transactions

## Overview

This change implements automatic conversion of EIP-2612 Permit and Permit2 signature requests to standard ERC20 `approve()` transactions when using Safe multisig wallets. This is necessary because Safe contracts cannot sign off-chain Permit messages (which use `ecrecover` to validate signatures), but can execute regular transactions.

## Problem Statement

When a dApp (like Uniswap) requests a Permit signature for a token approval:
1. The dApp is connected to a Safe multisig address
2. The Safe address is the token holder
3. Permit signatures require `ecrecover` validation, which would return the EOA address (not the Safe address)
4. This causes "Simple Keyring - Unable to find matching address" errors
5. Token approvals fail because the Safe contract cannot produce valid Permit signatures

## Solution

Automatically detect Permit signature requests and convert them to equivalent `approve()` transactions:
1. **Detection**: Intercept `eth_signTypedData_v4` requests in the RPC flow
2. **Conversion**: Extract token, spender, and amount from Permit data and create `approve()` calldata
3. **Wrapping**: Wrap the approve transaction through DefiInteractorModule (Safe's execution layer)
4. **Response**: After transaction succeeds, return a dummy signature to satisfy the dApp
5. **UI Context**: Preserve Safe address context for balance fetching and simulation

## Files Changed

### 1. `src/background/controller/provider/rpcFlow.ts`

**Changes**: Added Permit detection and conversion logic (lines 225-330)

**What it does**:
- Detects when `eth_signTypedData_v4` is called with Permit or Permit2 (PermitSingle) data
- Extracts token address, spender, and approval amount from typed data
- Creates ERC20 `approve(address,uint256)` calldata (function signature: 0x095ea7b3)
- Converts the request from `eth_signTypedData_v4` to `eth_sendTransaction`
- Updates approval type from `SignTypedData` to `SignTx`
- Marks the transaction with `_convertedPermit` flag for UI handling
- Returns dummy signature after transaction succeeds (lines 534-542)

**Key logic**:
```javascript
// Detect Permit types
const isStandardPermit = parsedData.primaryType === 'Permit' && ...
const isPermit2Single = parsedData.primaryType === 'PermitSingle' && ...

// Create approve() calldata
const approveData = `0x095ea7b3${spender.padStart(64, '0')}${amount.padStart(64, '0')}`;

// Convert request
ctx.request.data.method = 'eth_sendTransaction';
ctx.request.data.params = [{from: safeAddress, to: tokenAddress, data: approveData, value: '0x0'}];
```

### 2. `src/ui/utils/transaction.ts`

**Changes**: Added explicit handling for `approve` method (lines 37-60)

**What it does**:
- The existing `getCustomTxParamsData()` function only handled `increaseAllowance` and generic token methods
- Added dedicated parsing for `approve(address,uint256)` (method ID: 0x095ea7b3)
- Decodes spender address from transaction data
- Re-encodes approve call with user's custom amount when editing approval

**Why needed**:
- The generic `getTokenData()` parser was failing on converted Permit transactions
- Explicit handling ensures reliable approval amount editing for both regular and converted approvals

### 3. `src/ui/views/Approval/components/SignTx.tsx`

**Changes**: Updated address context for converted Permits (lines 625-667 and 1157-1171)

**What it does**:
- Checks for `_convertedPermit` and `_safeAddress` flags on transaction params
- Uses Safe address (instead of EOA address) for:
  - Transaction parsing (`txForActionParsing`)
  - Balance fetching in `explain()` function
- Ensures UI displays Safe's token balance, not EOA's balance

**Key logic**:
```javascript
const fromAddress = (normalizedParams as any)._convertedPermit && (normalizedParams as any)._safeAddress
  ? (normalizedParams as any)._safeAddress
  : from;
```

### 4. `src/ui/views/Approval/components/SignTestnetTx/index.tsx`

**Changes**: Same Safe address handling as SignTx.tsx (lines 301-323, 576-611, 622-636)

**What it does**:
- Mirrors the mainnet component changes for testnet transactions
- Uses Safe address for parsing and balance fetching when `_convertedPermit` is true
- Ensures consistent behavior between mainnet and testnet

### 5. `src/ui/views/Approval/components/SignTestnetTx/index.tsx`

**Changes**: Re-wrapping logic for modified transactions (lines 758-795)

**What it does**:
- When user edits approval amount, the transaction data changes
- Automatically re-wraps the modified approve transaction through DefiInteractorModule
- Preserves the Safe execution context after amount changes

## Transaction Flow

### Before (Permit Request - Failed)
```
1. Uniswap requests Permit signature for Safe address
2. Wallet tries to find keyring for Safe address
3. Error: "Simple Keyring - Unable to find matching address"
4. Approval fails
```

### After (Converted to Approve - Success)
```
1. Uniswap requests Permit signature for Safe address
2. RPC flow detects Permit and converts to approve transaction
3. Approve transaction wrapped through DefiInteractorModule
4. UI shows Safe's token balance
5. User approves transaction
6. Transaction executes on Safe
7. Dummy signature returned to Uniswap
8. Uniswap sees approval succeeded and continues
```

## Supported Permit Types

1. **EIP-2612 Standard Permit**:
   - Primary type: `Permit`
   - Domain: `verifyingContract` (token address)
   - Message: `spender`, `value`, `deadline`, `nonce`

2. **Permit2 (Uniswap Universal Router)**:
   - Primary type: `PermitSingle`
   - Message: `details.token`, `details.amount`, `spender`

## Edge Cases Handled

1. **Transaction Wrapping**: Conversion happens BEFORE wrapping logic, ensuring approve transactions go through DefiInteractorModule
2. **Amount Editing**: Users can edit approval amounts, which triggers re-wrapping with new amount
3. **Balance Display**: UI correctly shows Safe's token balance, not EOA's balance
4. **Dummy Signature**: After transaction succeeds, returns 0x00...00 signature to satisfy dApp expectations
5. **Error Handling**: Falls back to normal flow if Permit conversion fails

## Testing

To test this feature:
1. Connect a dApp (e.g., Uniswap) to a Safe multisig address
2. Attempt to swap tokens that require approval
3. Verify the wallet opens with an "Approve Token" transaction (not signature request)
4. Verify balance shows Safe's token balance
5. Edit the approval amount and confirm it updates correctly
6. Approve the transaction
7. Verify the dApp continues with the swap flow

## Future Improvements

1. Support for PermitBatch (multiple token approvals in one signature)
2. More detailed logging for debugging (currently removed for production)
3. UI indicator showing that Permit was converted to transaction
4. Configuration option to enable/disable automatic conversion
