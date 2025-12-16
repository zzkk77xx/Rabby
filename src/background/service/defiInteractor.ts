import { ethers } from 'ethers';
import preferenceService from './preference';

// ERC20 transfer function selector
const ERC20_TRANSFER_SELECTOR = '0xa9059cbb';

/**
 * DeFiInteractorModule ABI snippets
 */
const DEFI_INTERACTOR_ABI = [
  'function transferToken(address token, address recipient, uint256 amount) returns (bool)',
  'function executeOnProtocol(address target, bytes calldata data) returns (bytes memory)',
  'function executeOnProtocolWithValue(address target, bytes calldata data) payable returns (bytes memory)',
];

export interface WrapTransactionParams {
  to: string;
  data: string;
  value?: string;
}

export interface WrappedTransaction {
  to: string;
  data: string;
  value: string;
}

/**
 * Check if the transaction is an ERC20 transfer
 */
function isERC20Transfer(data: string): boolean {
  if (!data || data.length < 10) return false;
  const selector = data.slice(0, 10).toLowerCase();
  return selector === ERC20_TRANSFER_SELECTOR.toLowerCase();
}

/**
 * Parse ERC20 transfer data to extract recipient and amount
 */
function parseERC20Transfer(
  data: string
): { recipient: string; amount: string } | null {
  try {
    if (!isERC20Transfer(data)) return null;

    // Remove '0x' and function selector (first 4 bytes = 8 hex chars)
    const params = data.slice(10);

    // First 32 bytes (64 hex chars) = recipient address (last 20 bytes = 40 hex chars)
    const recipientHex = params.slice(24, 64);
    const recipient = '0x' + recipientHex;

    // Next 32 bytes (64 hex chars) = amount
    const amountHex = params.slice(64, 128);
    const amount = '0x' + amountHex;

    return { recipient, amount };
  } catch (error) {
    console.error('Failed to parse ERC20 transfer:', error);
    return null;
  }
}

/**
 * Wrap transaction with DeFiInteractorModule
 */
export async function wrapTransaction(
  tx: WrapTransactionParams
): Promise<WrappedTransaction | null> {
  const moduleAddress = preferenceService.getDefiInteractorModule();

  // If no module configured, return null (no wrapping)
  if (!moduleAddress) {
    return null;
  }

  const iface = new ethers.utils.Interface(DEFI_INTERACTOR_ABI);

  // Check if it's an ERC20 transfer
  if (isERC20Transfer(tx.data)) {
    const parsed = parseERC20Transfer(tx.data);
    if (!parsed) {
      console.error('[wrapTransaction] Failed to parse ERC20 transfer data');
      return null;
    }

    // Wrap with transferToken(token, recipient, amount)
    const wrappedData = iface.encodeFunctionData('transferToken', [
      tx.to, // token address
      parsed.recipient,
      parsed.amount,
    ]);

    return {
      to: moduleAddress,
      data: wrappedData,
      value: '0x0',
    };
  } else {
    // Check if transaction includes native asset value
    const hasValue = tx.value && ethers.BigNumber.from(tx.value).gt(0);

    // Wrap with executeOnProtocolWithValue if value present, otherwise executeOnProtocol
    const methodName = hasValue ? 'executeOnProtocolWithValue' : 'executeOnProtocol';
    const wrappedData = iface.encodeFunctionData(methodName, [
      tx.to,
      tx.data,
    ]);

    return {
      to: moduleAddress,
      data: wrappedData,
      value: tx.value || '0x0',
    };
  }
}

/**
 * Check if transaction should be wrapped
 */
export function shouldWrapTransaction(): boolean {
  const moduleAddress = preferenceService.getDefiInteractorModule();
  return !!moduleAddress;
}
