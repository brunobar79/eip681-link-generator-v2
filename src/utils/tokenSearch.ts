import { Token } from '../types';
import { CHAINS } from '../data/chains';

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceUsd: string;
  volume: {
    h24: number;
  };
  liquidity: {
    usd: number;
  };
}

interface DexScreenerResponse {
  pairs: DexScreenerPair[];
}

// Map DexScreener chain IDs to our chain IDs
const CHAIN_ID_MAP: Record<string, number> = {
  'ethereum': 1,
  'polygon': 137,
  'bsc': 56,
  'arbitrum': 42161,
  'optimism': 10,
  'avalanche': 43114,
  'base': 8453,
  'fantom': 250,
  'cronos': 25,
  'celo': 42220,
};

// Reverse map for our chain IDs to DexScreener chain IDs
const REVERSE_CHAIN_ID_MAP: Record<number, string> = Object.fromEntries(
  Object.entries(CHAIN_ID_MAP).map(([k, v]) => [v, k])
);

// Cache for token decimals to avoid repeated requests
const decimalsCache = new Map<string, number>();

// USDC cache - pre-populated with known USDC addresses for major chains
const USDC_CACHE: Record<number, Token[]> = {
  1: [{ // Ethereum
    chainId: 1,
    address: '0xA0b86a33E6441b4e5a03d8CCAC1E6B9D9e7BBE4a', // USDC
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86a33E6441b4e5a03d8CCAC1E6B9D9e7BBE4a/logo.png',
  }],
  137: [{ // Polygon
    chainId: 137,
    address: '0x2791Bca1f2de4661ED88A30D9EeE5F34C0e4B0C3', // USDC (Polygon)
    name: 'USD Coin (PoS)',
    symbol: 'USDC',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/assets/0x2791Bca1f2de4661ED88A30D9EeE5F34C0e4B0C3/logo.png',
  }],
  56: [{ // BSC
    chainId: 56,
    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC (BSC)
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 18,
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d/logo.png',
  }],
  42161: [{ // Arbitrum
    chainId: 42161,
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC (Arbitrum)
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0xaf88d065e77c8cC2239327C5EDb3A432268e5831/logo.png',
  }],
  10: [{ // Optimism
    chainId: 10,
    address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // USDC (Optimism)
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/assets/0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85/logo.png',
  }],
  43114: [{ // Avalanche
    chainId: 43114,
    address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // USDC (Avalanche)
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/assets/0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E/logo.png',
  }],
  8453: [{ // Base
    chainId: 8453,
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC (Base)
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913/logo.png',
  }],
  250: [{ // Fantom
    chainId: 250,
    address: '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75', // USDC (Fantom)
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/fantom/assets/0x04068DA6C83AFCFA0e13ba15A6696662335D5B75/logo.png',
  }],
};

export async function getTokenDecimals(address: string, chainId: number): Promise<number> {
  const cacheKey = `${chainId}-${address.toLowerCase()}`;
  
  if (decimalsCache.has(cacheKey)) {
    return decimalsCache.get(cacheKey)!;
  }

  try {
    // Get the chain info for RPC endpoint
    const chain = CHAINS.find(c => c.chainId === chainId);
    if (!chain) {
      console.warn(`Chain ${chainId} not found`);
      const fallbackDecimals = 18;
      decimalsCache.set(cacheKey, fallbackDecimals);
      return fallbackDecimals;
    }

    // Get the first available RPC URL
    const rpcEndpoint = chain.rpc?.find(rpc => rpc.url)?.url;
    
    if (!rpcEndpoint) {
      console.warn(`No RPC endpoint found for chain ${chainId}`);
      const fallbackDecimals = 18;
      decimalsCache.set(cacheKey, fallbackDecimals);
      return fallbackDecimals;
    }
    
    // Make RPC call to get decimals using the decimals() function
    const response = await fetch(rpcEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          {
            to: address,
            data: '0x313ce567' // decimals() function selector
          },
          'latest'
        ]
      })
    });

    const result = await response.json();
    
    if (result.result && result.result !== '0x') {
      const decimals = parseInt(result.result, 16);
      if (!isNaN(decimals) && decimals >= 0 && decimals <= 77) { // ERC20 spec limits
        decimalsCache.set(cacheKey, decimals);
        return decimals;
      }
    }
    
    // Fallback to 18 if RPC call doesn't return valid decimals
    console.warn(`Failed to get decimals for token ${address} on chain ${chainId}, using fallback`);
    const fallbackDecimals = 18;
    decimalsCache.set(cacheKey, fallbackDecimals);
    return fallbackDecimals;
    
  } catch (error) {
    console.error(`Error fetching decimals for token ${address} on chain ${chainId}:`, error);
    // Fallback to 18 if there's an error
    const fallbackDecimals = 18;
    decimalsCache.set(cacheKey, fallbackDecimals);
    return fallbackDecimals;
  }
}

export async function searchTokensOnDexScreener(
  query: string, 
  chainId: number
): Promise<Token[]> {
  if (!query || query.length < 2) {
    return [];
  }

  // Check if searching for USDC and return cached result if available
  const queryLower = query.toLowerCase();
  if (queryLower === 'usdc' || queryLower === 'usd coin') {
    const cachedUsdc = USDC_CACHE[chainId];
    if (cachedUsdc) {
      console.log(`Using cached USDC for chain ${chainId}`);
      return cachedUsdc;
    }
  }

  try {
    // Get the chain info
    const chain = CHAINS.find(c => c.chainId === chainId);
    if (!chain) {
      return [];
    }

    const nativeSymbol = chain.nativeCurrency.symbol;
    const dexScreenerChainId = REVERSE_CHAIN_ID_MAP[chainId];
    
    if (!dexScreenerChainId) {
      console.warn(`Chain ${chainId} not supported by DexScreener search`);
      return [];
    }

    // Search for pairs with the query token paired with native asset
    const searchUrl = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}/${nativeSymbol}`;
    
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error(`DexScreener API error: ${response.status}`);
    }

    const data: DexScreenerResponse = await response.json();
    
    if (!data.pairs || data.pairs.length === 0) {
      return [];
    }

    const tokens: Token[] = [];
    const seenAddresses = new Set<string>();

    for (const pair of data.pairs) {
      // Skip if not the right chain
      if (pair.chainId !== dexScreenerChainId) {
        continue;
      }

      // Check both baseToken and quoteToken for matches
      const candidates = [pair.baseToken, pair.quoteToken];
      
      for (const tokenData of candidates) {
        // Skip native tokens (address 0x0000...)
        if (tokenData.address === '0x0000000000000000000000000000000000000000') {
          continue;
        }

        // Check if this token matches our search query
        const symbolMatch = tokenData.symbol.toLowerCase().includes(query.toLowerCase());
        const nameMatch = tokenData.name.toLowerCase().includes(query.toLowerCase());
        
        if (!symbolMatch && !nameMatch) {
          continue;
        }

        // Skip duplicates
        if (seenAddresses.has(tokenData.address.toLowerCase())) {
          continue;
        }

        seenAddresses.add(tokenData.address.toLowerCase());

        // Get actual decimals for this token
        const decimals = await getTokenDecimals(tokenData.address, chainId);

        // Create token object
        const token: Token = {
          chainId: chainId,
          address: tokenData.address,
          name: tokenData.name,
          symbol: tokenData.symbol,
          decimals: decimals, // Now using actual decimals
          logoURI: generateTokenLogoUrl(tokenData.address, chainId),
        };

        tokens.push(token);

        // Cache USDC tokens for future use
        if (tokenData.symbol.toUpperCase() === 'USDC') {
          if (!USDC_CACHE[chainId]) {
            USDC_CACHE[chainId] = [];
          }
          // Add to cache if not already there
          const exists = USDC_CACHE[chainId].some(cachedToken => 
            cachedToken.address.toLowerCase() === token.address.toLowerCase()
          );
          if (!exists) {
            USDC_CACHE[chainId].push(token);
            console.log(`Cached USDC token for chain ${chainId}:`, token);
          }
        }
      }
    }

    // Sort by volume (highest first) and limit results
    return tokens
      .sort((a, b) => {
        const aPair = data.pairs.find(p => 
          p.baseToken.address === a.address || p.quoteToken.address === a.address
        );
        const bPair = data.pairs.find(p => 
          p.baseToken.address === b.address || p.quoteToken.address === b.address
        );
        
        const aVolume = aPair?.volume?.h24 || 0;
        const bVolume = bPair?.volume?.h24 || 0;
        
        return bVolume - aVolume;
      })
      .slice(0, 10);
      
  } catch (error) {
    console.error('Error searching tokens on DexScreener:', error);
    return [];
  }
}

function generateTokenLogoUrl(address: string, chainId: number): string {
  // Use Trust Wallet assets for token logos
  const chainName = REVERSE_CHAIN_ID_MAP[chainId] || 'ethereum';
  
  // Map some chain names to Trust Wallet format
  const trustWalletChainMap: Record<string, string> = {
    'ethereum': 'ethereum',
    'polygon': 'polygon',
    'bsc': 'smartchain',
    'arbitrum': 'arbitrum',
    'optimism': 'optimism',
    'avalanche': 'avalanchec',
    'base': 'base',
    'fantom': 'fantom',
  };

  const trustChainName = trustWalletChainMap[chainName];
  
  if (trustChainName) {
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${trustChainName}/assets/${address}/logo.png`;
  }
  
  // Fallback to a generic token icon
  return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/generic.png`;
} 