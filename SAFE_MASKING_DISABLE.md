# Safe Address Masking Control

## Overview

This feature allows you to disable Safe (Gnosis Safe) address masking for specific domains. By default, when you configure a Safe address via the DeFi Interactor module, Rabby presents the Safe address to all connected dapps instead of your EOA (Externally Owned Account).

With this implementation, you can configure specific origins where the actual EOA should be shown instead of the Safe address.

## Changes Made

### 1. New Preference Setting

Added `safeMaskingDisabledOrigins` to `PreferenceStore`:
- Type: `string[]`
- Default value: `['https://multisub.netlify.app']`
- Stores a list of origins where Safe address masking is disabled

### 2. New API Methods in PreferenceService

The following methods are now available:

```typescript
// Get the list of origins where Safe masking is disabled
getSafeMaskingDisabledOrigins(): string[]

// Add an origin to the disabled list
addSafeMaskingDisabledOrigin(origin: string): void

// Remove an origin from the disabled list
removeSafeMaskingDisabledOrigin(origin: string): void

// Check if Safe masking is disabled for a specific origin
isSafeMaskingDisabledForOrigin(origin: string): boolean
```

### 3. Exposed WalletController Methods

These methods are exposed in `WalletController` and can be called from the UI:

```typescript
wallet.getSafeMaskingDisabledOrigins()
wallet.addSafeMaskingDisabledOrigin(origin)
wallet.removeSafeMaskingDisabledOrigin(origin)
wallet.isSafeMaskingDisabledForOrigin(origin)
```

### 4. Per-Origin Address Broadcasting

Modified the account broadcasting logic:
- When `setCurrentAccount()` or `setDefiInteractorSafe()` is called, the extension now checks each connected session's origin
- For origins in the disabled list: broadcasts the actual EOA address
- For other origins: broadcasts the Safe address (if configured) or EOA as fallback

## Implementation Details

### File: `src/background/service/preference.ts`

#### Added Store Field
```typescript
export interface PreferenceStore {
  // ... existing fields
  safeMaskingDisabledOrigins?: string[];
}
```

#### New Private Method
```typescript
private broadcastAccountsChangedPerOrigin(account: Account)
```
This method iterates through all active sessions and broadcasts the appropriate address based on whether Safe masking is disabled for each origin.

#### Modified Methods
- `setCurrentAccount()`: Now uses `broadcastAccountsChangedPerOrigin()` instead of broadcasting to all origins uniformly
- `setDefiInteractorSafe()`: Now uses `broadcastAccountsChangedPerOrigin()` to handle per-origin logic

### File: `src/background/controller/wallet.ts`

Exposed the four new methods to make them accessible from the UI via the wallet proxy.

## How It Works

1. When a user switches accounts or changes Safe configuration, Rabby needs to notify all connected dapps
2. The system retrieves all active sessions (one per tab/origin)
3. For each session:
   - Check if the origin is in `safeMaskingDisabledOrigins`
   - If yes: send the EOA address
   - If no: send the Safe address (or EOA if no Safe is configured)
4. Each dapp receives the appropriate address based on its origin

## Usage Examples

### From the UI
```typescript
import { useWallet } from 'ui/utils';

const wallet = useWallet();

// Check if masking is disabled for a specific origin
const isDisabled = await wallet.isSafeMaskingDisabledForOrigin('https://multisub.netlify.app');

// Add a new origin to the disabled list
await wallet.addSafeMaskingDisabledOrigin('https://example.com');

// Remove an origin from the disabled list
await wallet.removeSafeMaskingDisabledOrigin('https://example.com');

// Get all disabled origins
const disabledOrigins = await wallet.getSafeMaskingDisabledOrigins();
```

### From Background Scripts
```typescript
import { preferenceService } from 'background/service';

// Add an origin
preferenceService.addSafeMaskingDisabledOrigin('https://test.app');

// Check status
const isDisabled = preferenceService.isSafeMaskingDisabledForOrigin('https://test.app');
```

## Default Configuration

By default, `https://multisub.netlify.app` is added to the disabled list. This means:
- When connecting to `multisub.netlify.app`, the actual EOA address will be shown
- When connecting to other dapps, the Safe address (if configured) will be shown

## Testing

To test this feature:

1. Configure a Safe address via the DeFi Interactor module
2. Connect to `https://multisub.netlify.app` - you should see your EOA address
3. Connect to any other dapp - you should see your Safe address
4. Use the API methods to add/remove origins from the disabled list
5. Verify that address changes are broadcasted correctly when switching accounts

## Future Enhancements

Potential improvements:
- UI settings page to manage the disabled origins list
- Per-origin configuration in the connection management UI
- Wildcard/pattern matching support (e.g., `*.netlify.app`)
- Migration support for existing users who need this feature
