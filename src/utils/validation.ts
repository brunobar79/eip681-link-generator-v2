export interface FormData {
  to: string
  chainId: number
  value: string
  tokenAddress: string
  gasLimit: string
  gasPrice: string
}

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export function isValidEthereumAddress(address: any): boolean {
  if (!address || typeof address !== 'string') {
    return false
  }

  // Check if it starts with 0x and has the correct length (42 characters total)
  const addressRegex = /^0x[a-fA-F0-9]{40}$/
  return addressRegex.test(address)
}

export function isValidAmount(amount: string): boolean {
  if (amount === '') {
    return true // Empty amounts are valid (optional)
  }

  if (typeof amount !== 'string') {
    return false
  }

  // Check for invalid strings first
  if (amount === 'NaN' || amount === 'Infinity' || amount === '-Infinity') {
    return false
  }

  // Check for negative numbers
  if (amount.startsWith('-')) {
    return false
  }

  // Use regex to validate proper decimal number format
  // This pattern allows: integers, decimals, but not multiple dots or invalid formats
  const validNumberPattern = /^(?:0|[1-9]\d*)(?:\.\d+)?$/
  
  if (!validNumberPattern.test(amount)) {
    return false
  }

  const num = parseFloat(amount)
  
  // Final check: ensure it's a valid finite number >= 0
  return !isNaN(num) && isFinite(num) && num >= 0
}

export function validateFormData(data: FormData): ValidationResult {
  const errors: Record<string, string> = {}

  // Validate recipient address
  if (!data.to) {
    errors.to = 'Recipient address is required'
  } else if (!isValidEthereumAddress(data.to)) {
    errors.to = 'Invalid Ethereum address'
  }

  // Validate chain ID
  if (!data.chainId || data.chainId <= 0) {
    errors.chainId = 'Invalid chain ID'
  }

  // Validate amount
  if (data.value && !isValidAmount(data.value)) {
    errors.value = 'Invalid amount'
  }

  // Validate token address if provided and not empty
  if (data.tokenAddress && data.tokenAddress.trim() !== '' && !isValidEthereumAddress(data.tokenAddress)) {
    errors.tokenAddress = 'Invalid token address'
  }

  // Validate gas limit if provided
  if (data.gasLimit && !isValidAmount(data.gasLimit)) {
    errors.gasLimit = 'Invalid gas limit'
  }

  // Validate gas price if provided
  if (data.gasPrice && !isValidAmount(data.gasPrice)) {
    errors.gasPrice = 'Invalid gas price'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
} 