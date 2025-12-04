# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About Rabby Wallet

Rabby is an open-source browser extension wallet for DeFi, providing multi-chain support and secure account management. It supports both Chrome (Manifest V3) and Firefox (Manifest V2).

## Development Commands

### Building

```bash
# Development build with file watching (Chrome MV3)
yarn build:dev

# Development build with more memory (for large builds)
yarn build:turbodev

# Production build (Chrome MV3)
yarn build:pro

# Firefox MV2 builds
yarn build:dev:mv2    # Development
yarn build:pro:mv2    # Production

# Debug build (production with debug logging)
yarn build:debug
```

The build output goes to `dist/` directory. Load the extension in Chrome via `chrome://extensions` (enable Developer Mode) or Firefox via `about:debugging`.

**Memory Issues**: If you encounter "JavaScript heap out of memory" errors during build, the webpack configuration has been optimized with:
- ESLint disabled during build (commented out in `build/webpack.common.config.js`)
- `transpileOnly: true` for ts-loader to skip type checking during build
- Less memory-intensive source maps (`eval-cheap-module-source-map`)
- Run `yarn lint:fix` separately for linting if needed

### Testing & Linting

```bash
# Run tests
yarn test

# Lint and auto-fix
yarn lint:fix
```

### Other Useful Commands

```bash
# Clean build artifacts
yarn clean

# Generate theme files
yarn make-theme

# Sync support chain list
yarn sync-chain
```

## Architecture Overview

Rabby is a browser extension with **4 isolated execution contexts** that communicate via message passing:

### 1. Background Script (`src/background/`)

The service worker (MV3) or persistent background page (MV2) that handles all business logic:

- **Entry point**: `src/background/index.ts` - Initializes all services and controllers
- **Storage**: User data stored in Chrome local storage, encrypted with user password
- **Services**: 25+ singleton service modules in `src/background/service/`
  - `keyring/` - Account and key management (15+ keyring types)
  - `preference.ts` - User settings, current account, cached balances
  - `permission.ts` - Dapp connection permissions
  - `session.ts` - Per-tab session management
  - `openapi.ts` - Backend API calls
  - `notification.ts` - Manages approval UI popups
  - `transactionHistory.ts` - Local transaction records
  - `transactionWatcher.ts` - Monitors pending transactions
  - `swapService.ts`, `bridgeService.ts` - DEX/bridge integrations
  - `securityEngine.ts` - Transaction risk analysis
  - Plus 15+ other specialized services

- **Controllers**: Request handlers
  - `controller/wallet.ts` (4000+ lines) - Main WalletController with 200+ methods exposed to UI
  - `controller/provider/` - Handles dapp RPC requests
    - `controller.ts` - Routes requests
    - `rpcFlow.ts` - Implements EIP-1193 methods (eth_sendTransaction, eth_signTypedData_v4, etc.)
    - `internalMethod.ts` - Extension-specific methods
    - `subscriptionManager.ts` - Handles eth_subscribe events

### 2. Content Script (`src/content-script/`)

Injected into every webpage at `document_start`. Acts as a message relay:
- Injects pageProvider into the page
- Uses **BroadcastChannel** to communicate with pageProvider
- Uses **chrome.runtime.connect** to communicate with background

### 3. Page Provider (from `@rabby-wallet/page-provider`)

Injected into the dapp's JavaScript context:
- Exposes `window.ethereum` API to dapps
- Cannot directly access extension APIs
- Sends messages to content-script via BroadcastChannel

### 4. UI (`src/ui/`)

React application with 3 HTML entry points sharing the same codebase:
- `popup.html` - Extension icon popup
- `notification.html` - Dapp approval requests (signing, transactions)
- `index.html` - Full tab interface
- `desktop.html` - Desktop app interface

Communicates with background via **PortMessage** (chrome.runtime.connect).

## Message Passing System

Located in `src/utils/message/`:

1. **PortMessage** - For Extension ↔ Background communication
   - Uses `chrome.runtime.connect()` for long-lived connections
   - Used by UI and content-script

2. **BroadcastChannelMessage** - For Page ↔ Content-Script
   - Uses `@metamask/post-message-stream`
   - Enables pageProvider to talk to content-script

3. **EventBus** (`src/eventBus.ts`) - Internal background events
   - Simple pub-sub for intra-background communication
   - Used for cross-service events (tx completion, wallet connect status, etc.)

**Example Message Flow** (dapp transaction):
```
Dapp calls window.ethereum.request({method: 'eth_sendTransaction'})
  ↓ BroadcastChannel
Content-script forwards via chrome.runtime.connect
  ↓ PortMessage
Background providerController receives, opens notification.html
  ↓
UI shows approval, user confirms
  ↓
Background signs & broadcasts transaction
  ↓
Response flows back through the chain
```

## State Management

### Background State

Services use **ObservableStore** pattern from `@metamask/obs-store`:
- Each service has a store that syncs to Chrome local storage
- Example: `keyringService.store.subscribe(value => storage.set('keyringState', value))`
- Key stores: `keyringState` (encrypted), `preference`, `permission`, `transactions`, etc.

### UI State

**Rematch** (`@rematch/core`) - Redux wrapper with TypeScript:
- Store configured in `src/ui/store.ts`
- Models defined in `src/ui/models/` (30+ models)
- Each model contains: state, reducers, effects
- Effects call background methods via `wallet.methodName()` proxy
- No direct persistence - UI state syncs from background

Access in components:
```typescript
import { useWallet } from 'ui/utils'
const wallet = useWallet()
await wallet.signTransaction(tx)
```

## Keyring & Account System

`src/background/service/keyring/` manages all account types:

**Core Keyrings:**
- `SimpleKeyring` - Private key imports
- `HdKeyring` - Mnemonic/seed phrases
- `WatchKeyring` - Watch-only addresses

**Hardware Wallets (15+ supported):**
- Ledger, Trezor, BitBox02, OneKey, Keystone, GridPlus Lattice, imKey, etc.
- Uses offscreen documents (`src/offscreen/`) for WebHID/WebUSB operations (MV3)

**Special Account Types:**
- `GnosisKeyring` - Safe multisig wallets
- `WalletConnectKeyring` - Mobile wallet connections
- `CoboArgusKeyring` - Institutional custody
- `CoinbaseKeyring` - Coinbase Wallet SDK

All keyring data is encrypted with user password via `@metamask/browser-passworder`.

## Directory Structure

- **`src/background/`** - Background script with services and controllers
- **`src/ui/`** - React app (views, components, models, hooks)
  - `views/` - 70+ page components organized by feature
  - `component/` - 75+ reusable components
  - `models/` - 30+ Rematch state models
  - `hooks/` - 37+ custom React hooks
- **`src/content-script/`** - Message relay (single file)
- **`src/utils/`** - Shared utilities (message passing, chain management, etc.)
- **`src/constant/`** - Constants and configuration (1693 lines in `index.ts`)
- **`src/migrations/`** - Data migration system for version upgrades
- **`src/offscreen/`** - Offscreen documents for hardware wallets (MV3)
- **`src/manifest/`** - Manifest files for Chrome MV3 and Firefox MV2
- **`build/`** - Webpack configurations (common, dev, pro, debug, sourcemap)

## TypeScript Path Aliases

Configured in `tsconfig.json`:
- `@/utils` → `src/utils`
- `@/*` → `src/*`
- `ui/*` → `src/ui/*`
- `background/*` → `src/background/*`
- `consts` → `src/constant/index`
- `assets` → `src/ui/assets`

## Key Patterns

### 1. Service Pattern
All background services are singletons exported from `src/background/service/index.ts`:
```typescript
import { keyringService, preferenceService } from 'background/service'
```

### 2. Persistent Storage
Services use `createPersistStore` wrapper:
```typescript
const store = await createPersistStore({ name: 'preference' })
store.updateState(newState)  // Auto-syncs to chrome.storage.local
```

### 3. Error Handling
Uses `eth-rpc-errors` for standardized errors:
```typescript
throw ethErrors.provider.userRejectedRequest()
throw ethErrors.rpc.invalidParams('Invalid address')
```

### 4. Chain Management
Uses `@debank/common` for chain definitions:
```typescript
import { CHAINS, CHAINS_ENUM } from '@debank/common'
```
Runtime chain list via `getChainList('mainnet')` and user custom networks via `customTestnetService`.

### 5. Transaction Lifecycle
1. `signTransaction()` - Validate, run security checks, show approval UI
2. `broadcastTransaction()` - Submit to RPC endpoint
3. `transactionWatchService` - Monitor pending tx
4. `transactionHistoryService` - Record completed tx
5. `EVENTS.TX_COMPLETED` - Broadcast completion event

### 6. Hardware Wallet Operations
For MV3, hardware wallet operations run in offscreen documents (`src/offscreen/scripts/`) due to WebHID/WebUSB requirements.

## Build System

Webpack with multiple configurations in `build/`:
- **Entry points**: background, content-script, pageProvider, ui, offscreen
- **Loaders**: ts-loader, less-loader, postcss-loader, file-loader
- **Plugins**: Styled-components transformation, path aliases, Sentry integration
- **Environments**: dev (watch mode), pro (minified), debug (with logging), sourcemap
- **Manifest selection**: Set via `MANIFEST_TYPE` env var (chrome-mv3, firefox-mv2)

Production builds split vendors into chunks to meet Firefox extension size limits.

## Adding a New Feature

1. **Create service** in `src/background/service/newFeature.ts`
   - Use ObservableStore if persistence needed
   - Export from `src/background/service/index.ts`

2. **Initialize service** in `src/background/index.ts`
   - Add to initialization sequence
   - Load persisted state if applicable

3. **Add controller methods** in `src/background/controller/wallet.ts`
   - Expose methods that UI will call
   - Or create new controller if complex

4. **Create UI model** in `src/ui/models/newFeature.ts`
   - Define state, reducers, effects
   - Add to `src/ui/models/index.ts` registry

5. **Create views** in `src/ui/views/NewFeature/`
   - Use existing components from `src/ui/component/`
   - Connect to model via Rematch hooks

## Important Constants

`src/constant/index.ts` contains:
- `CHAINS_ENUM` - Supported chain IDs
- `KEYRING_TYPE` - Account type constants
- `WALLET_BRAND_TYPES` - Hardware wallet brands
- `EVENTS` - Event names for EventBus
- `KEYRING_CLASS` - Keyring class mappings

## Key Dependencies

- **@debank/common** - Chain definitions and utilities
- **@rematch/core** - State management
- **@rabby-wallet/*** - Custom packages (keyrings, providers, security engine, APIs)
- **@metamask/*** - Ethereum utilities, RPC standards
- **@ethereumjs/*** - Transaction and crypto utilities
- **ethers** - Ethereum library
- **webextension-polyfill** - Cross-browser extension APIs
- **styled-components** - Component styling
- **antd** - UI component library
- **React 17** - UI framework

## Security Considerations

- All keyrings encrypted with user password
- Session isolation per tab
- Permission system with LRU cache for dapp connections
- Security engine analyzes transactions before signing
- Whitelist for trusted addresses
- Hardware wallet operations isolated in offscreen documents
