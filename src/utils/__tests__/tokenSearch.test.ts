import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { searchTokensOnDexScreener, getTokenDecimals } from '../tokenSearch'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Token Search', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('searchTokensOnDexScreener', () => {
    it('should return cached USDC for USDC search', async () => {
      const tokens = await searchTokensOnDexScreener('USDC', 8453) // Base chain
      
      expect(tokens).toHaveLength(1)
      expect(tokens[0]).toEqual({
        chainId: 8453,
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913/logo.png',
      })
      
      // Should not make API call for cached USDC
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should return cached USDC for "USD Coin" search', async () => {
      const tokens = await searchTokensOnDexScreener('USD Coin', 1) // Ethereum
      
      expect(tokens).toHaveLength(1)
      expect(tokens[0].symbol).toBe('USDC')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should return empty array for short query', async () => {
      const tokens = await searchTokensOnDexScreener('U', 1)
      expect(tokens).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should return empty array for empty query', async () => {
      const tokens = await searchTokensOnDexScreener('', 1)
      expect(tokens).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should make API call for non-USDC tokens', async () => {
      const mockResponse = {
        pairs: [
          {
            chainId: 'ethereum',
            baseToken: {
              address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
              name: 'Wrapped BTC',
              symbol: 'WBTC'
            },
            quoteToken: {
              address: '0x0000000000000000000000000000000000000000',
              name: 'Ether',
              symbol: 'ETH'
            },
            volume: { h24: 1000000 }
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      // Mock getTokenDecimals
      vi.doMock('../tokenSearch', async () => {
        const actual = await vi.importActual('../tokenSearch')
        return {
          ...actual,
          getTokenDecimals: vi.fn().mockResolvedValue(8)
        }
      })

      const tokens = await searchTokensOnDexScreener('WBTC', 1)
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.dexscreener.com/latest/dex/search?q=WBTC/ETH'
      )
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      const tokens = await searchTokensOnDexScreener('WBTC', 1)
      expect(tokens).toEqual([])
    })

    it('should handle unsupported chain', async () => {
      const tokens = await searchTokensOnDexScreener('USDC', 99999)
      expect(tokens).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('getTokenDecimals', () => {
    beforeEach(() => {
      mockFetch.mockClear()
    })

    it('should return cached decimals', async () => {
      // First call
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          result: '0x12' // 18 in hex
        })
      })

      const decimals1 = await getTokenDecimals('0x123', 1)
      expect(decimals1).toBe(18)

      // Second call should use cache
      const decimals2 = await getTokenDecimals('0x123', 1)
      expect(decimals2).toBe(18)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should handle RPC errors with fallback', async () => {
      mockFetch.mockRejectedValueOnce(new Error('RPC error'))
      
      const decimals = await getTokenDecimals('0x123', 1)
      expect(decimals).toBe(18) // fallback
    })

    it('should handle invalid RPC response with fallback', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          result: '0x'
        })
      })
      
      const decimals = await getTokenDecimals('0x123', 1)
      expect(decimals).toBe(18) // fallback
    })

    it('should validate decimals range', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          result: '0x4F' // 79 in hex, exceeds ERC20 limit
        })
      })
      
      const decimals = await getTokenDecimals('0x123', 1)
      expect(decimals).toBe(18) // fallback for invalid decimals
    })

    it('should handle missing chain with fallback', async () => {
      const decimals = await getTokenDecimals('0x123', 99999)
      expect(decimals).toBe(18) // fallback
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
}) 