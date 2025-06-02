import { isAddress, getAddress } from 'viem';
import { EIP681Params, TransactionFormData } from '../types';

/**
 * Safely converts an address to its checksummed format
 * Returns the original address if checksumming fails
 */
export function toChecksumAddress(address: string): string {
  try {
    return getAddress(address);
  } catch {
    // If getAddress fails, return the original address
    // This handles edge cases where the address might be invalid
    return address;
  }
}

/**
 * Generates an EIP-681 compliant URL for Ethereum transactions
 * Format: ethereum:<address>[@<chain_id>][/<function_name>][?<parameters>]
 */
export function generateEIP681URL(params: EIP681Params): string {
  const { chainId, address, functionName, value, gas, gasLimit, gasPrice, parameters } = params;

  // Start with the ethereum scheme and checksummed address
  const checksummedAddress = toChecksumAddress(address);
  let url = `ethereum:${checksummedAddress}`;

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
      // Checksum address parameters
      const processedVal = key === 'address' ? toChecksumAddress(val) : val;
      queryParams.push(`${key}=${encodeURIComponent(processedVal)}`);
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
    address: toChecksumAddress(tokenAddress),
    functionName: 'transfer',
    parameters: {
      address: toChecksumAddress(toAddress),
      ...(amount && amount !== '0' && parseFloat(amount) > 0 ? { uint256: amount } : {})
    }
  };

  return generateEIP681URL(params);
}

/**
 * Generates EIP-681 URL for native ETH transfers with proper wei conversion
 */
export function generateETHTransferURL(
  toAddress: string,
  value: string,
  chainId?: number,
  gasLimit?: string,
  gasPrice?: string
): string {
  const checksummedToAddress = toChecksumAddress(toAddress);
  let url = `ethereum:${checksummedToAddress}`;

  // Add chain ID if specified (mainnet is explicitly shown)
  if (chainId) {
    url += `@${chainId}`;
  }

  // Build query parameters
  const queryParams: string[] = [];
  
  // Convert ETH to wei but use scientific notation
  if (value && value !== '0' && parseFloat(value) > 0) {
    const valueInWei = parseFloat(value) * Math.pow(10, 18);
    const scientificNotation = valueInWei.toExponential().replace('e+', 'e');
    queryParams.push(`value=${scientificNotation}`);
  }
  
  if (gasLimit) {
    queryParams.push(`gas=${gasLimit}`);
  }
  
  if (gasPrice) {
    queryParams.push(`gasPrice=${gasPrice}`);
  }
  
  if (queryParams.length > 0) {
    url += `?${queryParams.join('&')}`;
  }
  
  return url;
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

  // Native ETH transfer - value is already in wei from form
  const checksummedToAddress = toChecksumAddress(toAddress);
  let url = `ethereum:${checksummedToAddress}`;

  // Add chain ID if specified
  if (chainId) {
    url += `@${chainId}`;
  }

  // Build query parameters
  const queryParams: string[] = [];
  
  // Use value directly (already in wei)
  if (value && value !== '0' && parseFloat(value) > 0) {
    queryParams.push(`value=${value}`);
  }
  
  if (gasLimit) {
    queryParams.push(`gas=${gasLimit}`);
  }
  
  if (gasPrice) {
    queryParams.push(`gasPrice=${gasPrice}`);
  }
  
  if (queryParams.length > 0) {
    url += `?${queryParams.join('&')}`;
  }
  
  return url;
}

/**
 * Parses an EIP-681 URL and extracts parameters with correct structure
 */
export function parseEIP681URL(url: string): any {
  try {
    // Remove ethereum: scheme
    if (!url.startsWith('ethereum:')) {
      return null;
    }

    const withoutScheme = url.substring(9); // Remove 'ethereum:'
    
    // Split by ? to separate address part from query parameters
    const [addressPart, queryString] = withoutScheme.split('?');
    
    // Parse address and chain ID
    let address: string = addressPart;
    let chainId: number | undefined;
    let functionName: string | undefined;
    
    // Check for chain ID
    if (addressPart.includes('@')) {
      const parts = addressPart.split('@');
      address = parts[0];
      const chainPart = parts[1];
      
      // Check if there's a function name after chain ID
      if (chainPart.includes('/')) {
        const [chain, func] = chainPart.split('/');
        chainId = parseInt(chain, 10);
        functionName = func;
      } else {
        chainId = parseInt(chainPart, 10);
      }
    }
    
    // Check for function name without chain ID
    if (!functionName && address.includes('/')) {
      const parts = address.split('/');
      address = parts[0];
      functionName = parts[1];
    }

    // Parse query parameters
    const parameters: Record<string, string> = {};

    if (queryString) {
      const params = new URLSearchParams(queryString);
      
      for (const [key, val] of params.entries()) {
        parameters[key] = val;
      }
    }

    // For the test format, return a simpler structure
    const result: any = {
      scheme: 'ethereum',
      address: toChecksumAddress(address),
      chainId,
      functionName,
      parameters: Object.keys(parameters).length > 0 ? 
        // Also checksum address parameters when parsing
        Object.fromEntries(
          Object.entries(parameters).map(([key, val]) => [
            key, 
            key === 'address' ? toChecksumAddress(val) : val
          ])
        ) : undefined
    };

    return result;
  } catch (error) {
    console.error('Error parsing EIP-681 URL:', error);
    return null;
  }
}

/**
 * Validates an Ethereum address
 */
export function validateAddress(address: string): boolean {
  try {
    // viem 2.x requires proper checksum format, so normalize first
    const checksummedAddress = getAddress(address);
    return isAddress(checksummedAddress);
  } catch {
    // If getAddress throws, the address is invalid
    return false;
  }
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

/**
 * Validates an EIP-681 URL format
 */
export function validateEIP681URL(url: string): boolean {
  try {
    // Basic format check
    if (!url.startsWith('ethereum:')) {
      return false;
    }

    const parsed = parseEIP681URL(url);
    if (!parsed) {
      return false;
    }

    // Validate address
    if (!validateAddress(parsed.address)) {
      return false;
    }

    // Validate chain ID if present
    if (parsed.chainId !== undefined && !validateChainId(parsed.chainId)) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
} 