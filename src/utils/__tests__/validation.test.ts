import { describe, it, expect } from 'vitest'
import { isValidEthereumAddress, validateFormData, isValidAmount } from '../validation'

describe('Validation Utilities', () => {
  describe('isValidEthereumAddress', () => {
    it('validates correct Ethereum addresses', () => {
      const validAddresses = [
        '0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5',
        '0x0000000000000000000000000000000000000000',
        '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
        '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'
      ]

      validAddresses.forEach(address => {
        expect(isValidEthereumAddress(address)).toBe(true)
      })
    })

    it('rejects invalid Ethereum addresses', () => {
      const invalidAddresses = [
        '',
        'invalid',
        '0x',
        '0x123',
        '742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5', // missing 0x
        '0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5G', // invalid character
        '0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5A', // too long
        '0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4', // too short
        null,
        undefined
      ]

      invalidAddresses.forEach(address => {
        expect(isValidEthereumAddress(address as any)).toBe(false)
      })
    })

    it('handles case insensitive addresses', () => {
      const address = '0x742d35cc6ab26de97f7b9b9c4fd3b174c8a2c4c5'
      expect(isValidEthereumAddress(address)).toBe(true)
    })
  })

  describe('isValidAmount', () => {
    it('validates positive numbers', () => {
      const validAmounts = ['1', '0.1', '1.5', '100', '0.000001', '1000000']

      validAmounts.forEach(amount => {
        expect(isValidAmount(amount)).toBe(true)
      })
    })

    it('rejects invalid amounts', () => {
      const invalidAmounts = [
        'invalid',
        '-1',
        'abc',
        '1.2.3',
        'NaN',
        'Infinity',
        '-Infinity'
      ]

      invalidAmounts.forEach(amount => {
        expect(isValidAmount(amount)).toBe(false)
      })
    })

    it('accepts zero and empty as valid (optional amounts)', () => {
      expect(isValidAmount('0')).toBe(true)
      expect(isValidAmount('')).toBe(true)
    })

    it('handles decimal precision', () => {
      expect(isValidAmount('0.000000000000000001')).toBe(true)
      expect(isValidAmount('1.123456789012345678')).toBe(true)
    })
  })

  describe('validateFormData', () => {
    const validFormData = {
      to: '0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5',
      chainId: 1,
      value: '1.0',
      tokenAddress: '',
      gasLimit: '',
      gasPrice: ''
    }

    it('validates correct form data', () => {
      const result = validateFormData(validFormData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('rejects missing recipient address', () => {
      const result = validateFormData({
        ...validFormData,
        to: ''
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.to).toBe('Recipient address is required')
    })

    it('rejects invalid recipient address', () => {
      const result = validateFormData({
        ...validFormData,
        to: 'invalid-address'
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.to).toBe('Invalid Ethereum address')
    })

    it('rejects invalid amount', () => {
      const result = validateFormData({
        ...validFormData,
        value: 'invalid-amount'
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.value).toBe('Invalid amount')
    })

    it('accepts empty amount', () => {
      const result = validateFormData({
        ...validFormData,
        value: ''
      })
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('validates token address when provided', () => {
      const result = validateFormData({
        ...validFormData,
        tokenAddress: 'invalid-token-address'
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.tokenAddress).toBe('Invalid token address')
    })

    it('accepts valid token address', () => {
      const result = validateFormData({
        ...validFormData,
        tokenAddress: '0xA0b86a33E6412CCF9B79C4a95C6f2A7D4C3B1E0F'
      })
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('validates gas parameters when provided', () => {
      const invalidGasData = {
        ...validFormData,
        gasLimit: 'invalid',
        gasPrice: 'invalid'
      }
      
      const result = validateFormData(invalidGasData)
      expect(result.isValid).toBe(false)
      expect(result.errors.gasLimit).toBe('Invalid gas limit')
      expect(result.errors.gasPrice).toBe('Invalid gas price')
    })

    it('accepts valid gas parameters', () => {
      const validGasData = {
        ...validFormData,
        gasLimit: '21000',
        gasPrice: '20000000000'
      }
      
      const result = validateFormData(validGasData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('handles multiple validation errors', () => {
      const invalidData = {
        to: 'invalid',
        chainId: 1,
        value: 'invalid',
        tokenAddress: 'invalid',
        gasLimit: 'invalid',
        gasPrice: 'invalid'
      }
      
      const result = validateFormData(invalidData)
      expect(result.isValid).toBe(false)
      expect(Object.keys(result.errors)).toHaveLength(5)
    })

    it('validates chain ID', () => {
      const result = validateFormData({
        ...validFormData,
        chainId: 0
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.chainId).toBe('Invalid chain ID')
    })
  })
}) 