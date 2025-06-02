import { describe, it, expect } from 'vitest'
import { 
  generateETHTransferURL, 
  generateTokenTransferURL, 
  formDataToEIP681URL,
  parseEIP681URL,
  validateEIP681URL 
} from '../eip681'
import { TransactionFormData } from '../../types'

describe('EIP-681 URL Generation', () => {
  describe('generateETHTransferURL', () => {
    it('should generate basic ETH transfer URL', () => {
      const url = generateETHTransferURL('0x742e1e5E0aDF53CbB81D725d5A8B2Cd5b10b5E2f', '1.5')
      expect(url).toBe('ethereum:0x742e1E5e0adf53Cbb81D725d5a8b2cD5B10B5E2F?value=1.5e18')
    })

    it('should generate ETH transfer URL with chain ID', () => {
      const url = generateETHTransferURL('0x742e1e5E0aDF53CbB81D725d5A8B2Cd5b10b5E2f', '1.5', 1)
      expect(url).toBe('ethereum:0x742e1E5e0adf53Cbb81D725d5a8b2cD5B10B5E2F@1?value=1.5e18')
    })

    it('should generate ETH transfer URL with gas parameters', () => {
      const url = generateETHTransferURL(
        '0x742e1e5E0aDF53CbB81D725d5A8B2Cd5b10b5E2f', 
        '1.5', 
        1, 
        '21000', 
        '20000000000'
      )
      expect(url).toBe('ethereum:0x742e1E5e0adf53Cbb81D725d5a8b2cD5B10B5E2F@1?value=1.5e18&gas=21000&gasPrice=20000000000')
    })

    it('should handle zero value', () => {
      const url = generateETHTransferURL('0x742e1e5E0aDF53CbB81D725d5A8B2Cd5b10b5E2f', '0')
      expect(url).toBe('ethereum:0x742e1E5e0adf53Cbb81D725d5a8b2cD5B10B5E2F')
    })

    it('should handle empty value', () => {
      const url = generateETHTransferURL('0x742e1e5E0aDF53CbB81D725d5A8B2Cd5b10b5E2f', '')
      expect(url).toBe('ethereum:0x742e1E5e0adf53Cbb81D725d5a8b2cD5B10B5E2F')
    })
  })

  describe('generateTokenTransferURL', () => {
    it('should generate basic token transfer URL', () => {
      const url = generateTokenTransferURL(
        '0xA0b86a33E6441b4e5a03d8CCAC1E6B9D9e7BBE4a', // USDC
        '0x742e1e5E0aDF53CbB81D725d5A8B2Cd5b10b5E2f',
        '100000000' // 100 USDC (6 decimals)
      )
      expect(url).toBe('ethereum:0xa0B86A33E6441B4E5a03D8CcAc1E6B9D9E7BBE4a/transfer?address=0x742e1E5e0adf53Cbb81D725d5a8b2cD5B10B5E2F&uint256=100000000')
    })

    it('should generate token transfer URL with chain ID', () => {
      const url = generateTokenTransferURL(
        '0xA0b86a33E6441b4e5a03d8CCAC1E6B9D9e7BBE4a',
        '0x742e1e5E0aDF53CbB81D725d5A8B2Cd5b10b5E2f',
        '100000000',
        8453 // Base
      )
      expect(url).toBe('ethereum:0xa0B86A33E6441B4E5a03D8CcAc1E6B9D9E7BBE4a@8453/transfer?address=0x742e1E5e0adf53Cbb81D725d5a8b2cD5B10B5E2F&uint256=100000000')
    })

    it('should handle zero amount', () => {
      const url = generateTokenTransferURL(
        '0xA0b86a33E6441b4e5a03d8CCAC1E6B9D9e7BBE4a',
        '0x742e1e5E0aDF53CbB81D725d5A8B2Cd5b10b5E2f',
        '0'
      )
      expect(url).toBe('ethereum:0xa0B86A33E6441B4E5a03D8CcAc1E6B9D9E7BBE4a/transfer?address=0x742e1E5e0adf53Cbb81D725d5a8b2cD5B10B5E2F')
    })
  })

  describe('formDataToEIP681URL', () => {
    it('should generate ETH transfer URL from form data', () => {
      const formData: TransactionFormData = {
        chainId: 1,
        toAddress: '0x742e1e5E0aDF53CbB81D725d5A8B2Cd5b10b5E2f',
        value: '1500000000000000000' // 1.5 ETH in wei
      }
      const url = formDataToEIP681URL(formData)
      expect(url).toBe('ethereum:0x742e1E5e0adf53Cbb81D725d5a8b2cD5B10B5E2F@1?value=1500000000000000000')
    })

    it('should generate token transfer URL from form data', () => {
      const formData: TransactionFormData = {
        chainId: 8453,
        toAddress: '0x742e1e5E0aDF53CbB81D725d5A8B2Cd5b10b5E2f',
        value: '100000000', // 100 USDC
        tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      }
      const url = formDataToEIP681URL(formData)
      expect(url).toBe('ethereum:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913@8453/transfer?address=0x742e1E5e0adf53Cbb81D725d5a8b2cD5B10B5E2F&uint256=100000000')
    })
  })

  describe('parseEIP681URL', () => {
    it('should parse basic ETH transfer URL', () => {
      const url = 'ethereum:0x742e1e5E0aDF53CbB81D725d5A8B2Cd5b10b5E2f?value=1.5e18'
      const parsed = parseEIP681URL(url)
      
      expect(parsed).toEqual({
        scheme: 'ethereum',
        address: '0x742e1E5e0adf53Cbb81D725d5a8b2cD5B10B5E2F',
        chainId: undefined,
        functionName: undefined,
        parameters: { value: '1.5e18' }
      })
    })

    it('should parse token transfer URL', () => {
      const url = 'ethereum:0xA0b86a33E6441b4e5a03d8CCAC1E6B9D9e7BBE4a@1/transfer?address=0x742e1e5E0aDF53CbB81D725d5A8B2Cd5b10b5E2f&uint256=100000000'
      const parsed = parseEIP681URL(url)
      
      expect(parsed).toEqual({
        scheme: 'ethereum',
        address: '0xa0B86A33E6441B4E5a03D8CcAc1E6B9D9E7BBE4a',
        chainId: 1,
        functionName: 'transfer',
        parameters: { 
          address: '0x742e1E5e0adf53Cbb81D725d5a8b2cD5B10B5E2F',
          uint256: '100000000'
        }
      })
    })

    it('should return null for invalid URL', () => {
      const parsed = parseEIP681URL('invalid-url')
      expect(parsed).toBeNull()
    })
  })

  describe('validateEIP681URL', () => {
    it('should validate correct ETH transfer URL', () => {
      const url = 'ethereum:0x742e1e5E0aDF53CbB81D725d5A8B2Cd5b10b5E2f?value=1.5e18'
      expect(validateEIP681URL(url)).toBe(true)
    })

    it('should validate correct token transfer URL', () => {
      const url = 'ethereum:0xA0b86a33E6441b4e5a03d8CCAC1E6B9D9e7BBE4a/transfer?address=0x742e1e5E0aDF53CbB81D725d5A8B2Cd5b10b5E2f&uint256=100000000'
      expect(validateEIP681URL(url)).toBe(true)
    })

    it('should invalidate malformed URL', () => {
      expect(validateEIP681URL('invalid-url')).toBe(false)
    })

    it('should invalidate URL with wrong scheme', () => {
      expect(validateEIP681URL('bitcoin:0x742e1e5E0aDF53CbB81D725d5A8B2Cd5b10b5E2f')).toBe(false)
    })

    it('should invalidate URL with invalid address', () => {
      expect(validateEIP681URL('ethereum:invalid-address')).toBe(false)
    })
  })
}) 