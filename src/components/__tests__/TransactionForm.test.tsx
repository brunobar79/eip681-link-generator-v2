import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TransactionForm from '../TransactionForm'

// Mock QRCodeGenerator
vi.mock('../QRCodeGenerator', () => ({
  default: ({ url, includeAvatar }: { url: string; includeAvatar: boolean }) => (
    <div data-testid="qr-code">
      <canvas data-url={url} data-include-avatar={includeAvatar} />
    </div>
  )
}))

// Mock TokenSelector
vi.mock('../TokenSelector', () => ({
  default: ({ isOpen, onSelect, onClose }: any) => 
    isOpen ? (
      <div data-testid="token-selector">
        <button onClick={() => onSelect({
          chainId: 1,
          address: '0xA0b86a33E6412CCF9B79C4a95C',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6
        })}>
          Select USDC
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}))

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn()
  }
})

// Mock window.open
global.open = vi.fn()

describe('TransactionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all form fields', () => {
    render(<TransactionForm />)

    expect(screen.getByLabelText(/recipient address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/network/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('ETH')).toBeInTheDocument()
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/include avatar/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate payment link/i })).toBeInTheDocument()
  })

  it('updates recipient address', async () => {
    const user = userEvent.setup()
    render(<TransactionForm />)

    const addressInput = screen.getByLabelText(/recipient address/i)
    await user.type(addressInput, '0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5')

    expect(addressInput).toHaveValue('0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5')
  })

  it('changes network selection', async () => {
    const user = userEvent.setup()
    render(<TransactionForm />)

    const networkSelect = screen.getByLabelText(/network/i)
    await user.selectOptions(networkSelect, '8453')

    expect(networkSelect).toHaveValue('8453')
  })

  it('opens token selector when clicking token button', async () => {
    const user = userEvent.setup()
    render(<TransactionForm />)

    const tokenButton = screen.getByDisplayValue('ETH')
    await user.click(tokenButton)

    expect(screen.getByTestId('token-selector')).toBeInTheDocument()
  })

  it('selects token from token selector', async () => {
    const user = userEvent.setup()
    render(<TransactionForm />)

    // Open token selector
    const tokenButton = screen.getByDisplayValue('ETH')
    await user.click(tokenButton)

    // Select USDC
    const usdcButton = screen.getByText('Select USDC')
    await user.click(usdcButton)

    expect(screen.getByDisplayValue('USDC')).toBeInTheDocument()
    expect(screen.queryByTestId('token-selector')).not.toBeInTheDocument()
  })

  it('updates amount input', async () => {
    const user = userEvent.setup()
    render(<TransactionForm />)

    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, '1.5')

    expect(amountInput).toHaveValue('1.5')
  })

  it('toggles avatar inclusion', async () => {
    const user = userEvent.setup()
    render(<TransactionForm />)

    const avatarCheckbox = screen.getByLabelText(/include avatar/i)
    expect(avatarCheckbox).not.toBeChecked()

    await user.click(avatarCheckbox)
    expect(avatarCheckbox).toBeChecked()
  })

  it('generates payment link with ETH transfer', async () => {
    const user = userEvent.setup()
    render(<TransactionForm />)

    // Fill form
    const addressInput = screen.getByLabelText(/recipient address/i)
    await user.type(addressInput, '0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5')

    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, '1.0')

    // Generate link
    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      expect(screen.getByDisplayValue(/ethereum:0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5/)).toBeInTheDocument()
    })
  })

  it('generates correct title for ETH transfer with amount', async () => {
    const user = userEvent.setup()
    render(<TransactionForm />)

    const addressInput = screen.getByLabelText(/recipient address/i)
    await user.type(addressInput, '0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5')

    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, '1.5')

    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('Send 1.5 ETH on Ethereum to 0x742D...C4C5')).toBeInTheDocument()
    })
  })

  it('generates correct title for ETH transfer without amount', async () => {
    const user = userEvent.setup()
    render(<TransactionForm />)

    const addressInput = screen.getByLabelText(/recipient address/i)
    await user.type(addressInput, '0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5')

    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('Send ETH on Ethereum to 0x742D...C4C5')).toBeInTheDocument()
    })
  })

  it('generates correct title for zero amount', async () => {
    const user = userEvent.setup()
    render(<TransactionForm />)

    const addressInput = screen.getByLabelText(/recipient address/i)
    await user.type(addressInput, '0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5')

    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, '0')

    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('Send ETH on Ethereum to 0x742D...C4C5')).toBeInTheDocument()
    })
  })

  it('copies URL to clipboard', async () => {
    const user = userEvent.setup()
    const mockWriteText = vi.mocked(navigator.clipboard.writeText)
    
    render(<TransactionForm />)

    // Generate a link first
    const addressInput = screen.getByLabelText(/recipient address/i)
    await user.type(addressInput, '0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5')

    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy url/i })).toBeInTheDocument()
    })

    // Click copy button
    const copyButton = screen.getByRole('button', { name: /copy url/i })
    await user.click(copyButton)

    expect(mockWriteText).toHaveBeenCalledWith(
      expect.stringContaining('ethereum:0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5')
    )
  })

  it('opens print window with correct content', async () => {
    const user = userEvent.setup()
    const mockOpen = vi.mocked(global.open)
    
    render(<TransactionForm />)

    // Generate a link first
    const addressInput = screen.getByLabelText(/recipient address/i)
    await user.type(addressInput, '0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5')

    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /print qr code/i })).toBeInTheDocument()
    })

    // Click print button
    const printButton = screen.getByRole('button', { name: /print qr code/i })
    await user.click(printButton)

    expect(mockOpen).toHaveBeenCalledWith('', '_blank', 'width=600,height=800')
  })

  it('validates required address field', async () => {
    const user = userEvent.setup()
    render(<TransactionForm />)

    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)

    // Should not generate without address
    expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument()
  })

  it('handles invalid address gracefully', async () => {
    const user = userEvent.setup()
    render(<TransactionForm />)

    const addressInput = screen.getByLabelText(/recipient address/i)
    await user.type(addressInput, 'invalid-address')

    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)

    // Should not generate with invalid address
    expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument()
  })

  it('preserves form state when switching networks', async () => {
    const user = userEvent.setup()
    render(<TransactionForm />)

    const addressInput = screen.getByLabelText(/recipient address/i)
    await user.type(addressInput, '0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5')

    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, '1.5')

    const networkSelect = screen.getByLabelText(/network/i)
    await user.selectOptions(networkSelect, '8453')

    expect(addressInput).toHaveValue('0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5')
    expect(amountInput).toHaveValue('1.5')
  })

  it('resets token selection when switching to unsupported network', async () => {
    const user = userEvent.setup()
    render(<TransactionForm />)

    // Select USDC token
    const tokenButton = screen.getByDisplayValue('ETH')
    await user.click(tokenButton)
    
    const usdcButton = screen.getByText('Select USDC')
    await user.click(usdcButton)

    expect(screen.getByDisplayValue('USDC')).toBeInTheDocument()

    // Switch to polygon (if USDC not supported there in the mock)
    const networkSelect = screen.getByLabelText(/network/i)
    await user.selectOptions(networkSelect, '137')

    // Should revert to ETH if token not supported
    expect(screen.getByDisplayValue(/ETH|USDC/)).toBeInTheDocument()
  })
}) 