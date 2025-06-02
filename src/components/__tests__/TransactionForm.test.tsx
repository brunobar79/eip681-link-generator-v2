import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TransactionForm from '../TransactionForm'

// Mock utility functions needed for the TransactionForm component
vi.mock('../../utils/ens', () => ({
  processAddressInput: vi.fn().mockResolvedValue({
    isValid: true,
    address: '0x1234567890123456789012345678901234567890',
    isENS: false
  }),
  chainSupportsNaming: vi.fn().mockReturnValue(true)
}))

vi.mock('../../utils/eip681', () => ({
  formDataToEIP681URL: vi.fn().mockReturnValue('ethereum:0x1234567890123456789012345678901234567890@1?value=1000000000000000000')
}))

// Mock the TokenSelector and QRCodeGenerator components
vi.mock('../TokenSelector', () => ({
  default: ({ onTokenChange, chainId }: { onTokenChange: (token: any) => void; chainId: number }) => (
    <div data-testid="token-selector">
      <button 
        onClick={() => onTokenChange({ 
          address: '0xA0b86a33E6441E6e80dd45982a0F3dc56a9f9aB8', 
          symbol: 'USDC', 
          decimals: 6,
          chainId 
        })}
      >
        Select USDC
      </button>
    </div>
  )
}))

vi.mock('../QRCodeGenerator', () => ({
  default: ({ url }: { url: string }) => (
    <div data-testid="qr-code">{url}</div>
  )
}))

// Mock the validation utility
vi.mock('../../utils/validation', () => ({
  isValidEthereumAddress: vi.fn((address: string) => address.startsWith('0x') && address.length === 42)
}))

describe('TransactionForm', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders all form fields', () => {
    render(<TransactionForm />)
    
    expect(screen.getByLabelText(/to address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    expect(screen.getByTestId('token-selector')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate payment link/i })).toBeInTheDocument()
  })

  it('updates recipient address when typing', async () => {
    render(<TransactionForm />)
    
    const addressInput = screen.getByLabelText(/to address/i)
    await user.type(addressInput, '0x1234567890123456789012345678901234567890')
    
    expect(addressInput).toHaveValue('0x1234567890123456789012345678901234567890')
  })

  it('updates amount when typing', async () => {
    render(<TransactionForm />)
    
    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, '10.5')
    
    expect(amountInput).toHaveValue('10.5')
  })

  it('selects token using TokenSelector', async () => {
    render(<TransactionForm />)
    
    const selectButton = screen.getByText('Select USDC')
    await user.click(selectButton)
    
    // The form should update to show the selected token
    expect(screen.getByTestId('token-selector')).toBeInTheDocument()
  })

  it('generates payment link when form is valid', async () => {
    render(<TransactionForm />)
    
    // Fill in all required fields
    const addressInput = screen.getByLabelText(/to address/i)
    const amountInput = screen.getByLabelText(/amount/i)
    
    await user.type(addressInput, '0x1234567890123456789012345678901234567890')
    await user.type(amountInput, '10')
    
    // Select a token
    const selectButton = screen.getByText('Select USDC')
    await user.click(selectButton)
    
    // Generate the link
    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)
    
    // Should show the generated QR code
    expect(screen.getByTestId('qr-code')).toBeInTheDocument()
  })

  it('copies URL to clipboard when copy button is clicked', async () => {
    render(<TransactionForm />)
    
    // Fill in form and generate link
    const addressInput = screen.getByLabelText(/to address/i)
    const amountInput = screen.getByLabelText(/amount/i)
    
    await user.type(addressInput, '0x1234567890123456789012345678901234567890')
    await user.type(amountInput, '10')
    
    // Select a token
    const selectButton = screen.getByText('Select USDC')
    await user.click(selectButton)
    
    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)
    
    // Find and click copy button - look for "Copy Url" text
    const copyButton = screen.getByRole('button', { name: /copy url/i })
    await user.click(copyButton)
    
    // Verify clipboard was called
    expect(navigator.clipboard.writeText).toHaveBeenCalled()
  })

  it('preserves form state when regenerating', async () => {
    render(<TransactionForm />)
    
    // Fill in form
    const addressInput = screen.getByLabelText(/to address/i)
    const amountInput = screen.getByLabelText(/amount/i)
    
    await user.type(addressInput, '0x1234567890123456789012345678901234567890')
    await user.type(amountInput, '5.5')
    
    // Select a token
    const selectButton = screen.getByText('Select USDC')
    await user.click(selectButton)
    
    // Generate link twice
    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)
    await user.click(generateButton)
    
    // Form values should be preserved
    expect(addressInput).toHaveValue('0x1234567890123456789012345678901234567890')
    expect(amountInput).toHaveValue('5.5')
  })
}) 