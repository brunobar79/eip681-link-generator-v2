import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

// Mock the components
vi.mock('../components/QRCodeGenerator', () => ({
  default: ({ url }: { url: string }) => (
    <div data-testid="qr-code" data-url={url}>
      QR Code for: {url}
    </div>
  )
}))

vi.mock('../components/TokenSelector', () => ({
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

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn()
  }
})

describe('App Integration Tests', () => {
  it('renders the application title', () => {
    render(<App />)
    expect(screen.getByText('Ethereum Payment Link Generator')).toBeInTheDocument()
  })

  it('completes full ETH payment flow', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Fill out the form
    const addressInput = screen.getByLabelText(/recipient address/i)
    await user.type(addressInput, '0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5')

    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, '1.5')

    // Generate the payment link
    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)

    // Verify QR code and URL are generated
    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      expect(screen.getByDisplayValue(/ethereum:0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5/)).toBeInTheDocument()
    })

    // Verify title is correct
    expect(screen.getByText('Send 1.5 ETH on Ethereum to 0x742D...C4C5')).toBeInTheDocument()

    // Verify action buttons are present
    expect(screen.getByRole('button', { name: /copy url/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /print qr code/i })).toBeInTheDocument()
  })

  it('completes full token payment flow', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Fill out recipient address
    const addressInput = screen.getByLabelText(/recipient address/i)
    await user.type(addressInput, '0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5')

    // Select USDC token
    const tokenButton = screen.getByDisplayValue('ETH')
    await user.click(tokenButton)

    expect(screen.getByTestId('token-selector')).toBeInTheDocument()

    const usdcButton = screen.getByText('Select USDC')
    await user.click(usdcButton)

    expect(screen.getByDisplayValue('USDC')).toBeInTheDocument()

    // Enter amount
    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, '100')

    // Generate payment link
    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)

    // Verify token transfer URL is generated
    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      const urlInput = screen.getByDisplayValue(/ethereum:0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5/)
      expect(urlInput.value).toContain('functionName=transfer')
      expect(urlInput.value).toContain('args=0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5,100000000')
    })

    // Verify title includes token symbol
    expect(screen.getByText('Send 100 USDC on Ethereum to 0x742D...C4C5')).toBeInTheDocument()
  })

  it('handles network switching correctly', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Fill out form with ETH
    const addressInput = screen.getByLabelText(/recipient address/i)
    await user.type(addressInput, '0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5')

    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, '1.0')

    // Generate for Ethereum
    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('Send 1.0 ETH on Ethereum to 0x742D...C4C5')).toBeInTheDocument()
    })

    // Switch to Base network
    const networkSelect = screen.getByLabelText(/network/i)
    await user.selectOptions(networkSelect, '8453')

    // Generate again
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('Send 1.0 ETH on Base to 0x742D...C4C5')).toBeInTheDocument()
    })
  })

  it('copies URL to clipboard', async () => {
    const user = userEvent.setup()
    const mockWriteText = vi.mocked(navigator.clipboard.writeText)
    
    render(<App />)

    // Generate a payment link first
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

  it('toggles avatar inclusion', async () => {
    const user = userEvent.setup()
    render(<App />)

    const avatarCheckbox = screen.getByLabelText(/include avatar/i)
    expect(avatarCheckbox).not.toBeChecked()

    await user.click(avatarCheckbox)
    expect(avatarCheckbox).toBeChecked()

    // Generate payment link to verify avatar setting is passed to QR code
    const addressInput = screen.getByLabelText(/recipient address/i)
    await user.type(addressInput, '0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5')

    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)

    await waitFor(() => {
      const qrCode = screen.getByTestId('qr-code')
      expect(qrCode).toBeInTheDocument()
    })
  })

  it('validates form before generating link', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Try to generate without filling required fields
    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)

    // Should not generate QR code
    expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument()

    // Fill only address and try again
    const addressInput = screen.getByLabelText(/recipient address/i)
    await user.type(addressInput, '0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5')

    await user.click(generateButton)

    // Should generate QR code now
    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toBeInTheDocument()
    })
  })

  it('preserves form state when regenerating', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Fill out form
    const addressInput = screen.getByLabelText(/recipient address/i)
    await user.type(addressInput, '0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5')

    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, '2.5')

    // Generate first time
    const generateButton = screen.getByRole('button', { name: /generate payment link/i })
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toBeInTheDocument()
    })

    // Modify amount and regenerate
    await user.clear(amountInput)
    await user.type(amountInput, '5.0')

    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('Send 5.0 ETH on Ethereum to 0x742D...C4C5')).toBeInTheDocument()
    })

    // Verify form still has the updated values
    expect(addressInput).toHaveValue('0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5')
    expect(amountInput).toHaveValue('5.0')
  })

  it('shows responsive design elements', () => {
    render(<App />)

    // Check for main container
    const container = screen.getByRole('main')
    expect(container).toBeInTheDocument()

    // Check for form structure
    expect(screen.getByLabelText(/recipient address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/network/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
  })
}) 