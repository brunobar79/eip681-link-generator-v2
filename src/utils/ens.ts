import { createPublicClient, http, isAddress, encodePacked, keccak256, namehash, Address } from 'viem';
import { normalize } from 'viem/ens';
import { mainnet, base, polygon, arbitrum, optimism } from 'viem/chains';
import { ExtendedChain, getChains } from '../data/chains';

// Basenames L2 Resolver contract address on Base
const BASENAME_L2_RESOLVER_ADDRESS = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD' as Address;

// L2 Resolver ABI (minimal required functions)
const L2_RESOLVER_ABI = [
  {
    inputs: [{ name: 'node', type: 'bytes32' }],
    name: 'addr',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'node', type: 'bytes32' }],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'node', type: 'bytes32' }, { name: 'key', type: 'string' }],
    name: 'text',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Request cache to prevent duplicate RPC calls
const resolverCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting
const requestTimestamps = new Map<string, number[]>();
const MAX_REQUESTS_PER_MINUTE = 10;

// Cache for chain data
let chainCache: ExtendedChain[] = [];

// Initialize chain cache
getChains().then(chains => {
  chainCache = chains;
}).catch(console.error);

/**
 * Gets ENS registry address for a chain
 */
function getENSRegistry(chainId: number): string | null {
  const chain = chainCache.find(c => c.chainId === chainId);
  return chain?.ens?.registry || null;
}

/**
 * Normalizes avatar URLs by replacing private IPFS gateways with public ones
 */
function normalizeAvatarUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  
  // Log the original URL for debugging
  console.log('Original avatar URL:', avatarUrl);
  
  try {
    const url = new URL(avatarUrl);
    
    // Replace Pinata gateway with public IPFS gateway
    if (url.hostname === 'tba-mobile.pinata.cloud') {
      const normalizedUrl = `https://ipfs.io${url.pathname}${url.search}${url.hash}`;
      console.log('Normalized Pinata URL:', normalizedUrl);
      return normalizedUrl;
    }
    
    // Handle other Pinata gateways
    if (url.hostname.includes('pinata.cloud') || url.hostname.includes('gateway.pinata.cloud')) {
      const normalizedUrl = `https://ipfs.io${url.pathname}${url.search}${url.hash}`;
      console.log('Normalized other Pinata URL:', normalizedUrl);
      return normalizedUrl;
    }
    
    // Handle direct IPFS hashes (ipfs://)
    if (avatarUrl.startsWith('ipfs://')) {
      const hash = avatarUrl.replace('ipfs://', '');
      const normalizedUrl = `https://ipfs.io/ipfs/${hash}`;
      console.log('Normalized IPFS protocol URL:', normalizedUrl);
      return normalizedUrl;
    }
    
    // Add other gateway replacements here if needed
    // if (url.hostname === 'other-private-gateway.com') {
    //   return `https://ipfs.io${url.pathname}${url.search}${url.hash}`;
    // }
    
    console.log('Avatar URL unchanged:', avatarUrl);
    return avatarUrl;
  } catch (error) {
    console.warn('Failed to parse avatar URL:', avatarUrl, error);
    // If URL parsing fails, return the original
    return avatarUrl;
  }
}

function canMakeRequest(key: string): boolean {
  const now = Date.now();
  const timestamps = requestTimestamps.get(key) || [];
  
  // Clean old timestamps
  const recentTimestamps = timestamps.filter(ts => now - ts < 60000); // 1 minute
  
  if (recentTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  recentTimestamps.push(now);
  requestTimestamps.set(key, recentTimestamps);
  return true;
}

function getCachedResult<T>(key: string): T | null {
  const cached = resolverCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.result;
  }
  return null;
}

function setCachedResult<T>(key: string, result: T): void {
  resolverCache.set(key, {
    result,
    timestamp: Date.now()
  });
}

// Chain-specific ENS configurations
const getPublicClient = (chainId: number) => {
  switch (chainId) {
    case 1: // Ethereum Mainnet
      return createPublicClient({
        chain: mainnet,
        transport: http('https://eth.llamarpc.com'),
      });
    case 8453: // Base
      return createPublicClient({
        chain: base,
        transport: http('https://mainnet.base.org'),
      });
    case 10: // Optimism
      return createPublicClient({
        chain: optimism,
        transport: http('https://mainnet.optimism.io'),
      });
    case 42161: // Arbitrum
      return createPublicClient({
        chain: arbitrum,
        transport: http('https://arb1.arbitrum.io/rpc'),
      });
    case 137: // Polygon
      return createPublicClient({
        chain: polygon,
        transport: http('https://polygon-rpc.com'),
      });
    default:
      // Fallback to Ethereum mainnet for other chains
      return createPublicClient({
        chain: mainnet,
        transport: http('https://eth.llamarpc.com'),
      });
  }
};

// Base client for Basenames resolution
const baseClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

export interface ENSResult {
  address: string;
  ensName: string;
  avatar: string | null;
  isValid: boolean;
  isENS: boolean;
}

/**
 * Convert an chainId to a coinType hex for reverse chain resolution
 */
export const convertChainIdToCoinType = (chainId: number): string => {
  // L1 resolvers to addr
  if (chainId === mainnet.id) {
    return "addr";
  }

  const cointype = (0x80000000 | chainId) >>> 0;
  return cointype.toString(16).toLocaleUpperCase();
};

/**
 * Convert an address to a reverse node for ENS resolution
 */
export const convertReverseNodeToBytes = (
  address: Address,
  chainId: number
) => {
  const addressFormatted = address.toLocaleLowerCase() as Address;
  const addressNode = keccak256(addressFormatted.substring(2) as Address);
  const chainCoinType = convertChainIdToCoinType(chainId);
  const baseReverseNode = namehash(
    `${chainCoinType.toLocaleUpperCase()}.reverse`
  );
  const addressReverseNode = keccak256(
    encodePacked(["bytes32", "bytes32"], [baseReverseNode, addressNode])
  );
  return addressReverseNode;
};

/**
 * Checks if a string looks like an ENS name
 */
export function isENSName(name: string): boolean {
  if (!name) return false;
  
  // Basic ENS name pattern: contains a dot and ends with a known TLD
  const ensPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.([a-zA-Z]{2,}(\.[a-zA-Z]{2,})*)$/;
  const knownTLDs = ['eth', 'xyz', 'com', 'org', 'io', 'app', 'art', 'club'];
  
  if (!ensPattern.test(name)) return false;
  
  // Handle .base.eth domains (Basenames)
  if (name.toLowerCase().endsWith('.base.eth')) {
    return true;
  }
  
  const tld = name.split('.').pop()?.toLowerCase();
  return knownTLDs.includes(tld || '');
}

/**
 * Determines if a name is a Basename (.base.eth)
 */
export function isBasename(name: string): boolean {
  return name.toLowerCase().endsWith('.base.eth');
}

/**
 * Determines if a chain supports naming services
 */
export function chainSupportsNaming(chainId: number): boolean {
  // Base supports Basenames
  if (chainId === 8453) return true;
  
  // Check if chain has ENS registry
  return !!getENSRegistry(chainId);
}

/**
 * Determines if a name is supported on a specific chain
 */
export function isNameSupportedOnChain(name: string, chainId: number): boolean {
  if (isBasename(name)) {
    // Basenames only work on Base
    return chainId === 8453;
  }
  
  if (isENSName(name)) {
    // Regular ENS works on chains with ENS registry
    return !!getENSRegistry(chainId);
  }
  
  return false;
}

/**
 * Resolve a Basename to an address using Base's L2 resolver
 */
async function resolveBasename(basename: string): Promise<{ address: string | null; avatar: string | null }> {
  const cacheKey = `basename-${basename.toLowerCase()}`;
  
  // Check cache first
  const cached = getCachedResult<{ address: string | null; avatar: string | null }>(cacheKey);
  if (cached) {
    return cached;
  }

  // Rate limiting
  if (!canMakeRequest(`basename-${basename}`)) {
    console.warn('Rate limit exceeded for Basename resolution:', basename);
    return { address: null, avatar: null };
  }

  try {
    const node = namehash(basename);
    
    // Get address from L2 resolver
    const address = await baseClient.readContract({
      abi: L2_RESOLVER_ABI,
      address: BASENAME_L2_RESOLVER_ADDRESS,
      functionName: 'addr',
      args: [node],
    });

    const finalAddress = address === '0x0000000000000000000000000000000000000000' ? null : address;
    
    // Only get avatar if we have a valid address to avoid unnecessary requests
    let avatar: string | null = null;
    if (finalAddress) {
      try {
        const rawAvatar = await baseClient.readContract({
          abi: L2_RESOLVER_ABI,
          address: BASENAME_L2_RESOLVER_ADDRESS,
          functionName: 'text',
          args: [node, 'avatar'],
        });
        avatar = normalizeAvatarUrl(rawAvatar);
      } catch (avatarError) {
        // Avatar is optional, continue without it
        avatar = null;
      }
    }

    const result = { address: finalAddress, avatar };
    
    // Cache the result
    setCachedResult(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Basename resolution error:', error);
    const result = { address: null, avatar: null };
    setCachedResult(cacheKey, result);
    return result;
  }
}

/**
 * Reverse resolve an address to a Basename using Base's L2 resolver
 */
async function reverseResolveBasename(address: Address): Promise<{ ensName: string | null; avatar: string | null }> {
  const cacheKey = `reverse-basename-${address.toLowerCase()}`;
  
  // Check cache first
  const cached = getCachedResult<{ ensName: string | null; avatar: string | null }>(cacheKey);
  if (cached) {
    return cached;
  }

  // Rate limiting
  if (!canMakeRequest(`reverse-basename-${address}`)) {
    console.warn('Rate limit exceeded for reverse Basename resolution:', address);
    return { ensName: null, avatar: null };
  }

  try {
    const addressReverseNode = convertReverseNodeToBytes(address, base.id);
    
    const basename = await baseClient.readContract({
      abi: L2_RESOLVER_ABI,
      address: BASENAME_L2_RESOLVER_ADDRESS,
      functionName: 'name',
      args: [addressReverseNode],
    });

    if (!basename) {
      const result = { ensName: null, avatar: null };
      setCachedResult(cacheKey, result);
      return result;
    }

    // Only get avatar if we have a basename
    let avatar: string | null = null;
    try {
      const node = namehash(basename);
      const rawAvatar = await baseClient.readContract({
        abi: L2_RESOLVER_ABI,
        address: BASENAME_L2_RESOLVER_ADDRESS,
        functionName: 'text',
        args: [node, 'avatar'],
      });
      avatar = normalizeAvatarUrl(rawAvatar);
    } catch (avatarError) {
      // Avatar is optional
      avatar = null;
    }

    const result = { ensName: basename, avatar };
    setCachedResult(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Reverse Basename resolution error:', error);
    const result = { ensName: null, avatar: null };
    setCachedResult(cacheKey, result);
    return result;
  }
}

/**
 * Resolves an ENS name to an address for a specific chain
 */
export async function resolveENSName(
  ensName: string, 
  chainId: number = 1
): Promise<{ address: string | null; avatar: string | null }> {
  try {
    if (!isENSName(ensName)) {
      return { address: null, avatar: null };
    }

    // Check if this name is supported on this chain
    if (!isNameSupportedOnChain(ensName, chainId)) {
      console.log(`Name ${ensName} is not supported on chain ${chainId}`);
      return { address: null, avatar: null };
    }

    // For Basenames on Base
    if (isBasename(ensName) && chainId === 8453) {
      return await resolveBasename(ensName);
    }

    // For regular ENS names on chains with ENS registry
    if (!isBasename(ensName) && getENSRegistry(chainId)) {
      const client = getPublicClient(chainId);
      const normalizedName = normalize(ensName);
      
      // Resolve both address and avatar simultaneously
      const [address, rawAvatar] = await Promise.all([
        client.getEnsAddress({ name: normalizedName }),
        client.getEnsAvatar({ name: normalizedName }).catch(() => null)
      ]);

      const avatar = normalizeAvatarUrl(rawAvatar);
      return { address, avatar };
    }

    // No naming service support for this chain
    return { address: null, avatar: null };
  } catch (error) {
    console.error('ENS resolution error:', error);
    return { address: null, avatar: null };
  }
}

/**
 * Resolves an address back to an ENS name and avatar
 */
export async function reverseResolveENS(
  address: string,
  chainId: number = 1
): Promise<{ ensName: string | null; avatar: string | null }> {
  try {
    if (!isAddress(address)) {
      return { ensName: null, avatar: null };
    }

    // Only resolve on chains that support naming services
    if (!chainSupportsNaming(chainId)) {
      return { ensName: null, avatar: null };
    }

    // For Base chain, try Basename resolution
    if (chainId === 8453) {
      return await reverseResolveBasename(address as Address);
    }

    // For Ethereum mainnet and other chains with ENS registry, use standard ENS resolution
    if (getENSRegistry(chainId)) {
      const client = getPublicClient(chainId);
      
      const ensName = await client.getEnsName({
        address: address as `0x${string}`,
      });

      if (!ensName) {
        return { ensName: null, avatar: null };
      }

      // Get avatar for the resolved name
      const rawAvatar = await client.getEnsAvatar({
        name: ensName,
      }).catch(() => null);

      const avatar = normalizeAvatarUrl(rawAvatar);
      return { ensName, avatar };
    }

    // No naming service support
    return { ensName: null, avatar: null };
  } catch (error) {
    console.error('Reverse ENS resolution error:', error);
    return { ensName: null, avatar: null };
  }
}

/**
 * Processes an input string and returns resolved information
 */
export async function processAddressInput(
  input: string,
  chainId: number = 1
): Promise<ENSResult> {
  const trimmedInput = input.trim();
  
  // If it's already a valid address, return as-is
  if (isAddress(trimmedInput)) {
    const { ensName, avatar } = await reverseResolveENS(trimmedInput, chainId);
    return {
      address: trimmedInput,
      ensName: ensName || '',
      avatar,
      isValid: true,
      isENS: false,
    };
  }
  
  // If it looks like an ENS name, try to resolve it
  if (isENSName(trimmedInput)) {
    // Check if this name is supported on the current chain
    if (!isNameSupportedOnChain(trimmedInput, chainId)) {
      return {
        address: '',
        ensName: trimmedInput,
        avatar: null,
        isValid: false,
        isENS: true,
      };
    }
    
    // Resolve the name on the appropriate chain
    const { address, avatar } = await resolveENSName(trimmedInput, chainId);
    return {
      address: address || '',
      ensName: trimmedInput,
      avatar,
      isValid: !!address,
      isENS: true,
    };
  }
  
  // Invalid input
  return {
    address: '',
    ensName: '',
    avatar: null,
    isValid: false,
    isENS: false,
  };
}

/**
 * Resolves an ENS avatar for a given name or address
 */
export async function resolveENSAvatar(
  nameOrAddress: string,
  chainId: number = 1
): Promise<string | null> {
  try {
    // For Basenames on Base only
    if (isBasename(nameOrAddress) && chainId === 8453) {
      const { avatar } = await resolveBasename(nameOrAddress);
      return avatar;
    }

    // For regular ENS on chains with ENS registry
    if (!isBasename(nameOrAddress) && getENSRegistry(chainId)) {
      const client = getPublicClient(chainId);
      
      // If it's an address, first get the ENS name
      if (isAddress(nameOrAddress)) {
        const ensName = await client.getEnsName({
          address: nameOrAddress as `0x${string}`,
        });
        if (!ensName) return null;
        nameOrAddress = ensName;
      }

      // Get the avatar for the ENS name
      const rawAvatar = await client.getEnsAvatar({
        name: normalize(nameOrAddress),
      });

      return normalizeAvatarUrl(rawAvatar);
    }

    // No naming service support for this chain/name combination
    return null;
  } catch (error) {
    console.error('ENS avatar resolution error:', error);
    return null;
  }
}

/**
 * Gets the appropriate ENS explorer URL for a chain
 */
export function getENSExplorerUrl(ensName: string, chainId: number): string {
  // For Basenames, always use Base explorer
  if (isBasename(ensName)) {
    return `https://www.base.org/names/${ensName}`;
  }
  
  switch (chainId) {
    case 8453: // Base
      return `https://www.base.org/names/${ensName}`;
    case 10: // Optimism
      return `https://optimistic.etherscan.io/enslookup-search?search=${ensName}`;
    default:
      return `https://app.ens.domains/name/${ensName}`;
  }
} 