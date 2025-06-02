import { isAddress } from 'viem';
import { EIP681Params, TransactionFormData } from '../types';

/**
 * Generates an EIP-681 compliant URL for Ethereum transactions
 * Format: ethereum:<address>[@<chain_id>][/<function_name>][?<parameters>]
 */
export function generateEIP681URL(params: EIP681Params): string {
  const { chainId, address, functionName, value, gas, gasLimit, gasPrice, parameters } = params;

  // Start with the ethereum scheme and address
  let url = `ethereum:${address}`;

  // Add chain ID if specified
  if (chainId && chainId !== 1) {
    url += `@${chainId}`;
  }

  // Add function name if specified
  if (functionName) {
    url += `/${functionName}`;
  }

  // Build query parameters
  const queryParams: string[] = [];

  if (value && value !== '0') {
    queryParams.push(`value=${value}`);
  }

  if (gas) {
    queryParams.push(`gas=${gas}`);
  }

  if (gasLimit) {
    queryParams.push(`gasLimit=${gasLimit}`);
  }

  if (gasPrice) {
    queryParams.push(`gasPrice=${gasPrice}`);
  }

  // Add custom parameters
  if (parameters) {
    Object.entries(parameters).forEach(([key, val]) => {
      queryParams.push(`${key}=${encodeURIComponent(val)}`);
    });
  }

  // Add query string if there are parameters
  if (queryParams.length > 0) {
    url += `?${queryParams.join('&')}`;
  }

  return url;
}

/**
 * Generates EIP-681 URL for ERC-20 token transfers
 */
export function generateTokenTransferURL(
  tokenAddress: string,
  toAddress: string,
  amount: string,
  chainId?: number
): string {
  const params: EIP681Params = {
    chainId,
    address: tokenAddress,
    functionName: 'transfer',
    parameters: {
      address: toAddress,
      ...(amount && amount !== '0' && parseFloat(amount) > 0 ? { uint256: amount } : {})
    }
  };

  return generateEIP681URL(params);
}

/**
 * Generates EIP-681 URL for native ETH transfers
 */
export function generateETHTransferURL(
  toAddress: string,
  value: string,
  chainId?: number,
  gasLimit?: string,
  gasPrice?: string
): string {
  const params: EIP681Params = {
    chainId,
    address: toAddress,
    ...(value && value !== '0' && parseFloat(value) > 0 ? { value } : {}),
    gasLimit,
    gasPrice
  };

  return generateEIP681URL(params);
}

/**
 * Converts form data to EIP-681 URL
 */
export function formDataToEIP681URL(formData: TransactionFormData): string {
  const { chainId, toAddress, value, tokenAddress, gasLimit, gasPrice } = formData;

  // If token transfer (ERC-20)
  if (tokenAddress) {
    return generateTokenTransferURL(tokenAddress, toAddress, value || '', chainId);
  }

  // Native ETH transfer
  return generateETHTransferURL(toAddress, value || '', chainId, gasLimit, gasPrice);
}

/**
 * Parses an EIP-681 URL and extracts parameters
 */
export function parseEIP681URL(url: string): EIP681Params | null {
  try {
    // Remove ethereum: scheme
    if (!url.startsWith('ethereum:')) {
      return null;
    }

    const withoutScheme = url.substring(9); // Remove 'ethereum:'
    
    // Split by ? to separate address part from query parameters
    const [addressPart, queryString] = withoutScheme.split('?');
    
    // Parse address and chain ID
    let address: string;
    let chainId: number | undefined;
    
    if (addressPart.includes('@')) {
      const [addr, chain] = addressPart.split('@');
      address = addr;
      chainId = parseInt(chain, 10);
    } else {
      address = addressPart;
    }

    // Parse function name if present
    let functionName: string | undefined;
    if (address.includes('/')) {
      const parts = address.split('/');
      address = parts[0];
      functionName = parts[1];
    }

    // Parse query parameters
    const parameters: Record<string, string> = {};
    let value: string | undefined;
    let gas: string | undefined;
    let gasLimit: string | undefined;
    let gasPrice: string | undefined;

    if (queryString) {
      const params = new URLSearchParams(queryString);
      
      for (const [key, val] of params.entries()) {
        switch (key) {
          case 'value':
            value = val;
            break;
          case 'gas':
            gas = val;
            break;
          case 'gasLimit':
            gasLimit = val;
            break;
          case 'gasPrice':
            gasPrice = val;
            break;
          default:
            parameters[key] = val;
        }
      }
    }

    return {
      chainId,
      address,
      functionName,
      value,
      gas,
      gasLimit,
      gasPrice,
      parameters: Object.keys(parameters).length > 0 ? parameters : undefined
    };
  } catch (error) {
    console.error('Error parsing EIP-681 URL:', error);
    return null;
  }
}

/**
 * Validates an Ethereum address
 */
export function validateAddress(address: string): boolean {
  return isAddress(address);
}

/**
 * Validates a numeric string (for amounts, gas, etc.)
 */
export function validateNumericString(value: string): boolean {
  if (!value) return true; // Optional fields
  return /^\d+(\.\d+)?$/.test(value) && parseFloat(value) >= 0;
}

/**
 * Validates chain ID
 */
export function validateChainId(chainId: number): boolean {
  return Number.isInteger(chainId) && chainId > 0;
}

/**
 * Converts Wei to Ether string
 */
export function weiToEther(wei: string): string {
  const weiValue = BigInt(wei);
  const etherValue = Number(weiValue) / 1e18;
  return etherValue.toString();
}

/**
 * Converts Ether to Wei string
 */
export function etherToWei(ether: string): string {
  const etherValue = parseFloat(ether);
  const weiValue = BigInt(Math.floor(etherValue * 1e18));
  return weiValue.toString();
}

/**
 * Formats token amount based on decimals
 */
export function formatTokenAmount(amount: string, decimals: number): string {
  const amountValue = parseFloat(amount);
  const multiplier = Math.pow(10, decimals);
  const tokenUnits = BigInt(Math.floor(amountValue * multiplier));
  return tokenUnits.toString();
} 