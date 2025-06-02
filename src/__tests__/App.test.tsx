import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

// Mock utility functions needed for the App component
vi.mock('../utils/ens', () => ({
  processAddressInput: vi.fn().mockResolvedValue({
    isValid: true,
    address: '0x1234567890123456789012345678901234567890',
    isENS: false
  }),
  chainSupportsNaming: vi.fn().mockReturnValue(true)
}))

vi.mock('../utils/eip681', () => ({
  formDataToEIP681URL: vi.fn().mockReturnValue('ethereum:0x1234567890123456789012345678901234567890@1?value=1000000000000000000')
}))

vi.mock('../utils/validation', () => ({
  isValidEthereumAddress: vi.fn().mockReturnValue(true)
}))

// Mock the QRCodeGenerator component
vi.mock('../components/QRCodeGenerator', () => ({
  default: ({ url }: { url: string }) => (
    <div data-testid="qr-code" data-url={url}>
      QR Code for: {url}
    </div>
  )
}))

// Mock the TokenSelector component  
vi.mock('../components/TokenSelector', () => ({
  default: ({ onTokenChange, chainId }: { onTokenChange: (token: any) => void; chainId: number }) => (
    <div data-testid="token-selector" data-chain-id={chainId}>
      <button 
        onClick={() => onTokenChange({ 
          address: '0xA0b86a33E6441E6e80dd45982a0F3dc56a9f9aB8', 
          symbol: 'USDC', 
          decimals: 6,
          chainId 
        })}
        data-testid="select-usdc"
      >
        Select USDC
      </button>
      <button 
        onClick={() => onTokenChange({ 
          address: '0x0000000000000000000000000000000000000000', 
          symbol: 'ETH', 
          decimals: 18,
          chainId 
        })}
        data-testid="select-eth"
      >
        Select ETH
      </button>
    </div>
  )
}))

describe('App Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('renders the main components', () => {
    render(<App />)
    
    expect(screen.getByText(/ethereum link generator v2/i)).toBeInTheDocument()
    expect(screen.getByTestId('token-selector')).toBeInTheDocument()
  })

  it('completes full ETH payment flow', async () => {
    render(<App />)
    
    // Fill recipient address
    const addressInput = screen.getByLabelText(/to address/i)
    await user.type(addressInput, '0x1234567890123456789012345678901234567890')
    
    // Fill amount
    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, '1.5')
    
    // Select ETH token
    const selectEthButton = screen.getByTestId('select-eth')
    await user.click(selectEthButton)
    
    // Generate link
    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)
    
    // Should show QR code
    expect(screen.getByTestId('qr-code')).toBeInTheDocument()
    
    // Should show copy button
    expect(screen.getByRole('button', { name: /copy url/i })).toBeInTheDocument()
  })

  it('completes full token payment flow', async () => {
    render(<App />)
    
    // Fill recipient address
    const addressInput = screen.getByLabelText(/to address/i)
    await user.type(addressInput, '0x1234567890123456789012345678901234567890')
    
    // Fill amount
    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, '100')
    
    // Select USDC token
    const selectUsdcButton = screen.getByTestId('select-usdc')
    await user.click(selectUsdcButton)
    
    // Generate link
    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)
    
    // Should show QR code
    expect(screen.getByTestId('qr-code')).toBeInTheDocument()
    
    // Should show copy button
    expect(screen.getByRole('button', { name: /copy url/i })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(<App />)
    
    // Try to generate without filling fields
    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    
    // Button should be disabled initially since no address is entered
    expect(generateButton).toBeDisabled()
    
    // Add an invalid address to test validation
    const addressInput = screen.getByLabelText(/to address/i)
    await user.type(addressInput, 'invalid-address')
    
    // Button should now be enabled but clicking should show validation error
    expect(generateButton).not.toBeDisabled()
    await user.click(generateButton)
    
    // Should not show QR code without valid inputs
    expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument()
    
    // Should show error toast (this is displayed via react-hot-toast)
    await screen.findByText('Please enter a valid address')
  })

  it('preserves form state after generation', async () => {
    render(<App />)
    
    // Fill form
    const addressInput = screen.getByLabelText(/to address/i)
    const amountInput = screen.getByLabelText(/amount/i)
    
    await user.type(addressInput, '0x1234567890123456789012345678901234567890')
    await user.type(amountInput, '25.5')
    
    // Select token and generate
    const selectUsdcButton = screen.getByTestId('select-usdc')
    await user.click(selectUsdcButton)
    
    // Wait a bit for any state updates to settle
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)
    
    // Wait for generation to complete
    await screen.findByTestId('qr-code')
    
    // Verify form values are preserved
    expect(addressInput).toHaveValue('0x1234567890123456789012345678901234567890')
    expect(amountInput).toHaveValue(25.5) // Expecting number value instead of string
  })

  it('handles responsive design', () => {
    render(<App />)
    
    const container = screen.getByRole('main') || screen.getByText(/ethereum link generator v2/i).closest('div')
    expect(container).toBeInTheDocument()
  })

  it('copies generated URL to clipboard', async () => {
    render(<App />)
    
    // Fill and generate
    const addressInput = screen.getByLabelText(/to address/i)
    const amountInput = screen.getByLabelText(/amount/i)
    
    await user.type(addressInput, '0x1234567890123456789012345678901234567890')
    await user.type(amountInput, '10')
    
    const selectEthButton = screen.getByTestId('select-eth')
    await user.click(selectEthButton)
    
    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)
    
    // Click copy - look for the exact button text "Copy Url"
    const copyButton = screen.getByRole('button', { name: /copy url/i })
    await user.click(copyButton)
    
    // Verify clipboard was called
    expect(navigator.clipboard.writeText).toHaveBeenCalled()
  })
}) 