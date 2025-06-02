import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TokenSelector from '../TokenSelector'

// Mock the token search function
vi.mock('../../utils/tokenSearch', () => ({
  searchTokensOnDexScreener: vi.fn()
}))

import { searchTokensOnDexScreener } from '../../utils/tokenSearch'

const mockTokens = [
  {
    chainId: 1,
    address: '0xA0b86a33E6412CCF9B79C4a95C',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoURI: 'https://example.com/usdc.png'
  },
  {
    chainId: 1,
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    logoURI: 'https://example.com/usdt.png'
  }
]

describe('TokenSelector', () => {
  const mockOnSelect = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(searchTokensOnDexScreener as any).mockResolvedValue(mockTokens)
  })

  it('renders with search input', () => {
    render(
      <TokenSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        chainId={1}
      />
    )

    expect(screen.getByPlaceholderText('Search tokens...')).toBeInTheDocument()
    expect(screen.getByText('Select Token')).toBeInTheDocument()
  })

  it('shows loading state when searching', async () => {
    const user = userEvent.setup()
    
    render(
      <TokenSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        chainId={1}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search tokens...')
    await user.type(searchInput, 'USDC')

    expect(screen.getByText('Searching...')).toBeInTheDocument()
  })

  it('displays search results', async () => {
    const user = userEvent.setup()
    
    render(
      <TokenSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        chainId={1}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search tokens...')
    await user.type(searchInput, 'USD')

    await waitFor(() => {
      expect(screen.getByText('USD Coin')).toBeInTheDocument()
      expect(screen.getByText('USDC')).toBeInTheDocument()
      expect(screen.getByText('Tether USD')).toBeInTheDocument()
      expect(screen.getByText('USDT')).toBeInTheDocument()
    })
  })

  it('calls onSelect when token is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <TokenSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        chainId={1}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search tokens...')
    await user.type(searchInput, 'USD')

    await waitFor(() => {
      expect(screen.getByText('USD Coin')).toBeInTheDocument()
    })

    await user.click(screen.getByText('USD Coin'))

    expect(mockOnSelect).toHaveBeenCalledWith(mockTokens[0])
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <TokenSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        chainId={1}
      />
    )

    const closeButton = screen.getByLabelText('Close token selector')
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('closes when backdrop is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <TokenSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        chainId={1}
      />
    )

    const backdrop = screen.getByRole('dialog').previousSibling
    await user.click(backdrop as Element)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('shows "No tokens found" when search returns empty', async () => {
    const user = userEvent.setup()
    ;(searchTokensOnDexScreener as any).mockResolvedValue([])
    
    render(
      <TokenSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        chainId={1}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search tokens...')
    await user.type(searchInput, 'NONEXISTENT')

    await waitFor(() => {
      expect(screen.getByText('No tokens found')).toBeInTheDocument()
    })
  })

  it('debounces search input', async () => {
    const user = userEvent.setup()
    
    render(
      <TokenSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        chainId={1}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search tokens...')
    
    // Type multiple characters quickly
    await user.type(searchInput, 'U')
    await user.type(searchInput, 'S')
    await user.type(searchInput, 'D')
    await user.type(searchInput, 'C')

    // Should only call search once after debounce
    await waitFor(() => {
      expect(searchTokensOnDexScreener).toHaveBeenCalledTimes(1)
    })
  })

  it('does not render when isOpen is false', () => {
    render(
      <TokenSelector
        isOpen={false}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        chainId={1}
      />
    )

    expect(screen.queryByText('Select Token')).not.toBeInTheDocument()
  })

  it('displays token logos when available', async () => {
    const user = userEvent.setup()
    
    render(
      <TokenSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        chainId={1}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search tokens...')
    await user.type(searchInput, 'USD')

    await waitFor(() => {
      const usdcImage = screen.getByAltText('USDC logo')
      expect(usdcImage).toBeInTheDocument()
      expect(usdcImage).toHaveAttribute('src', 'https://example.com/usdc.png')
    })
  })

  it('handles search errors gracefully', async () => {
    const user = userEvent.setup()
    ;(searchTokensOnDexScreener as any).mockRejectedValue(new Error('API Error'))
    
    render(
      <TokenSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        chainId={1}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search tokens...')
    await user.type(searchInput, 'USD')

    await waitFor(() => {
      expect(screen.getByText('No tokens found')).toBeInTheDocument()
    })
  })
}) 