import { Chain } from '../types';

// Extended chain interface to include ENS registry and icon slug
export interface ExtendedChain extends Chain {
  ens?: {
    registry: string;
  };
  icon?: string;
  shortName: string;
  rpc: Array<{ url: string; tracking?: string; isOpenSource?: boolean }>;
}

// Cache for chainlist data
let chainlistCache: ExtendedChain[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Fetches chain data from chainlist.org
 */
async function fetchChainlistData(): Promise<ExtendedChain[]> {
  try {
    const response = await fetch('https://chainlist.org/rpcs.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch chainlist data: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter and transform the data to only include chains we want to support
    const supportedChainIds = [
      1,      // Ethereum Mainnet
      5,      // Goerli (deprecated but still used)
      11155111, // Sepolia
      137,    // Polygon
      80001,  // Polygon Mumbai
      56,     // BSC
      97,     // BSC Testnet
      42161,  // Arbitrum One
      421613, // Arbitrum Goerli
      10,     // Optimism
      420,    // Optimism Goerli
      43114,  // Avalanche
      43113,  // Avalanche Fuji
      8453,   // Base
      84531,  // Base Goerli
      84532,  // Base Sepolia
      100,    // Gnosis Chain
      250,    // Fantom
      4002,   // Fantom Testnet
      25,     // Cronos
      338,    // Cronos Testnet
      1313161554, // Aurora
      1313161555, // Aurora Testnet
      42220,  // Celo
      44787,  // Celo Alfajores
      1101,   // Polygon zkEVM
      1442,   // Polygon zkEVM Testnet
      324,    // zkSync Era
      280,    // zkSync Era Testnet
    ];
    
    const chains: ExtendedChain[] = data
      .filter((chain: any) => supportedChainIds.includes(chain.chainId))
      .map((chain: any) => ({
        chainId: chain.chainId,
        name: chain.name,
        chain: chain.chain || 'ETH',
        shortName: chain.shortName,
        networkId: chain.networkId || chain.chainId,
        rpc: chain.rpc || [],
        faucets: chain.faucets || [],
        nativeCurrency: {
          name: chain.nativeCurrency?.name || 'Ether',
          symbol: chain.nativeCurrency?.symbol || 'ETH',
          decimals: chain.nativeCurrency?.decimals || 18,
        },
        infoURL: chain.infoURL || '',
        icon: chain.icon,
        ens: chain.ens,
        explorers: chain.explorers || [],
      }))
      .sort((a: ExtendedChain, b: ExtendedChain) => {
        // Sort by importance: mainnets first, then testnets
        const aIsTestnet = a.faucets.length > 0 || a.name.toLowerCase().includes('test') || a.name.toLowerCase().includes('goerli') || a.name.toLowerCase().includes('sepolia');
        const bIsTestnet = b.faucets.length > 0 || b.name.toLowerCase().includes('test') || b.name.toLowerCase().includes('goerli') || b.name.toLowerCase().includes('sepolia');
        
        if (aIsTestnet !== bIsTestnet) {
          return aIsTestnet ? 1 : -1;
        }
        
        // Within same category, sort by chain ID
        return a.chainId - b.chainId;
      });
    
    return chains;
  } catch (error) {
    console.error('Failed to fetch chainlist data:', error);
    return getFallbackChains();
  }
}

/**
 * Gets chain data with caching
 */
export async function getChains(): Promise<ExtendedChain[]> {
  const now = Date.now();
  
  // Return cached data if it's still fresh
  if (chainlistCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return chainlistCache;
  }
  
  // Fetch fresh data
  const chains = await fetchChainlistData();
  chainlistCache = chains;
  cacheTimestamp = now;
  
  return chains;
}

/**
 * Gets a chain icon URL using the llamao.fi service
 */
export function getChainIcon(chain: ExtendedChain): string {
  if (chain.icon) {
    return `https://icons.llamao.fi/icons/chains/rsz_${chain.icon}.jpg`;
  }
  
  // Fallback based on chain ID for well-known chains
  const iconMap: Record<number, string> = {
    1: 'ethereum',
    5: 'ethereum',
    11155111: 'ethereum',
    137: 'polygon',
    80001: 'polygon',
    56: 'binance',
    97: 'binance',
    42161: 'arbitrum',
    421613: 'arbitrum',
    10: 'optimism',
    420: 'optimism',
    43114: 'avalanche',
    43113: 'avalanche',
    8453: 'base',
    84531: 'base',
    84532: 'base',
    100: 'gnosis',
    250: 'fantom',
    4002: 'fantom',
    25: 'cronos',
    338: 'cronos',
    1313161554: 'aurora',
    1313161555: 'aurora',
    42220: 'celo',
    44787: 'celo',
    1101: 'polygon',
    1442: 'polygon',
    324: 'zksync',
    280: 'zksync',
  };
  
  const iconSlug = iconMap[chain.chainId] || 'ethereum';
  return `https://icons.llamao.fi/icons/chains/rsz_${iconSlug}.jpg`;
}

/**
 * Fallback chain data if chainlist.org is unavailable
 */
function getFallbackChains(): ExtendedChain[] {
  return [
    {
      chainId: 1,
      name: 'Ethereum Mainnet',
      chain: 'ETH',
      shortName: 'eth',
      networkId: 1,
      rpc: [{ url: 'https://eth.llamarpc.com', tracking: 'none', isOpenSource: true }],
      faucets: [],
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      infoURL: 'https://ethereum.org',
      icon: 'ethereum',
      ens: { registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' },
      explorers: [{ name: 'Etherscan', url: 'https://etherscan.io', standard: 'EIP3091' }],
    },
    {
      chainId: 8453,
      name: 'Base',
      chain: 'ETH',
      shortName: 'base',
      networkId: 8453,
      rpc: [{ url: 'https://mainnet.base.org', tracking: 'none' }],
      faucets: [],
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      infoURL: 'https://base.org',
      icon: 'base',
      ens: { registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' },
      explorers: [{ name: 'Basescan', url: 'https://basescan.org', standard: 'EIP3091' }],
    },
    // Add other fallback chains as needed
  ];
}

// Initialize and export chains
let CHAINS: ExtendedChain[] = [];

// Load chains asynchronously
getChains().then(chains => {
  CHAINS.length = 0;
  CHAINS.push(...chains);
}).catch(console.error);

// Export synchronous access (will be empty initially, then populated)
export { CHAINS };

// Also export a promise-based getter for components that need to wait
export const getChainsAsync = getChains;

export const getChainById = (chainId: number): Chain | undefined => {
  return CHAINS.find(chain => chain.chainId === chainId);
};

export const getChainByName = (name: string): Chain | undefined => {
  return CHAINS.find(chain => 
    chain.name.toLowerCase().includes(name.toLowerCase()) ||
    chain.shortName.toLowerCase().includes(name.toLowerCase())
  );
};

export const getMainnets = (): Chain[] => {
  return CHAINS.filter(chain => !chain.faucets.length);
};

export const getTestnets = (): Chain[] => {
  return CHAINS.filter(chain => chain.faucets.length > 0);
}; 