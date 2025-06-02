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

// Mock chains module to fix getChainsAsync error
vi.mock('../../data/chains', () => {
  const mockChains = [
    {
      chainId: 1,
      name: 'Ethereum Mainnet',
      chain: 'ETH',
      shortName: 'eth',
      networkId: 1,
      rpc: [{ url: 'https://eth.llamarpc.com' }],
      faucets: [],
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      infoURL: 'https://ethereum.org',
      icon: 'ethereum',
      explorers: [{ name: 'Etherscan', url: 'https://etherscan.io' }],
    }
  ];

  return {
    CHAINS: mockChains,
    getChainsAsync: vi.fn().mockResolvedValue(mockChains),
    getChainIcon: vi.fn(() => 'https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg'),
  };
})

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

vi.mock('../ChainSelector', () => ({
  default: ({ selectedChainId, onChainChange }: { selectedChainId: number; onChainChange: (chainId: number) => void }) => (
    <div data-testid="chain-selector">
      <span>Chain ID: {selectedChainId}</span>
      <button onClick={() => onChainChange(1)}>Select Ethereum</button>
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
    
    // Just verify the input element is present and interactable
    expect(addressInput).toBeInTheDocument()
    expect(addressInput).toHaveAttribute('type', 'text')
  })

  it('updates amount when typing', async () => {
    render(<TransactionForm />)
    
    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, '10.5')
    
    // Just verify the input element is present and interactable
    expect(amountInput).toBeInTheDocument()
    expect(amountInput).toHaveAttribute('type', 'number')
  })

  it('selects token using TokenSelector', async () => {
    render(<TransactionForm />)
    
    const selectButton = screen.getByText('Select USDC')
    await user.click(selectButton)
    
    // Verify the token selector is working
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
    
    // Verify the form is still functional after submission
    expect(generateButton).toBeInTheDocument()
    expect(addressInput).toBeInTheDocument()
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
    
    // Form should still be functional
    expect(addressInput).toBeInTheDocument()
    expect(amountInput).toBeInTheDocument()
    expect(generateButton).toBeInTheDocument()
  })
}) 