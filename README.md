# Ethereum Payment Link Generator v2

[![CI](https://github.com/brunobar79/eip681-link-generator-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/brunobar79/eip681-link-generator-v2/actions/workflows/ci.yml)
[![Deploy](https://github.com/brunobar79/eip681-link-generator-v2/actions/workflows/deploy.yml/badge.svg)](https://github.com/brunobar79/eip681-link-generator-v2/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern web application for generating EIP-681 compliant Ethereum payment links with QR codes. This tool allows users to create payment requests for ETH and various ERC-20 tokens across multiple networks.

## 🌐 Live Demo

**[Try it live on GitHub Pages →](https://brunobar79.github.io/eip681-link-generator-v2/)**

The application is automatically deployed from the main branch and always reflects the latest stable version.

## Features

- 🔗 **EIP-681 Compliant**: Generate standard Ethereum payment URLs
- 🌐 **Multi-Network Support**: Ethereum, Base, Polygon, Arbitrum, and Optimism
- 🪙 **Token Support**: ETH and ERC-20 tokens with automatic token discovery
- 📱 **QR Code Generation**: Scannable QR codes for mobile wallets
- 🎨 **Avatar Integration**: Optional ENS/Basename avatar inclusion in QR codes
- 🖨️ **Print-Friendly**: Dedicated print layout for clean QR code printing
- 📋 **One-Click Copy**: Easy URL copying to clipboard
- 🔍 **Token Search**: Real-time token search with USDC caching optimization
- ⚡ **Fast & Responsive**: Modern React application with optimized performance
- 🧪 **Comprehensive Testing**: Full test suite with 90%+ coverage

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/brunobar79/eip681-link-generator-v2.git
   cd eip681-link-generator-v2
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:5173`

## Usage

### Creating Payment Links

1. **Enter recipient address**: Input a valid Ethereum address
2. **Select network**: Choose from Ethereum, Base, Polygon, Arbitrum, or Optimism
3. **Choose token**: Select ETH or search for ERC-20 tokens
4. **Set amount** (optional): Specify the payment amount
5. **Generate link**: Click "Generate Payment Link" to create QR code and URL

### Advanced Features

- **Avatar Integration**: Check "Include Avatar" to add ENS/Basename avatars to QR codes
- **Print QR Code**: Use the print button for clean, single-page QR code printing
- **Copy URL**: One-click copying of payment URLs to clipboard
- **Token Search**: Search for tokens by name or symbol with instant results

## Testing

This project includes a comprehensive test suite covering:

### Test Categories

- **Unit Tests**: Individual utility functions and components
- **Integration Tests**: Complete user workflows and app functionality
- **Component Tests**: React component behavior and props
- **API Tests**: Token search and blockchain interactions

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- TokenSelector.test.tsx
```

### Test Coverage

Our test suite covers:

- **Utils**: EIP-681 URL generation, validation, token search
- **Components**: TransactionForm, TokenSelector, QRCodeGenerator
- **Integration**: End-to-end user workflows
- **Edge Cases**: Error handling, invalid inputs, network switching

Key test files:
- `src/utils/__tests__/eip681.test.ts` - EIP-681 URL generation
- `src/utils/__tests__/tokenSearch.test.ts` - Token search with caching
- `src/utils/__tests__/validation.test.ts` - Form and address validation
- `src/components/__tests__/TransactionForm.test.tsx` - Main form component
- `src/components/__tests__/TokenSelector.test.tsx` - Token selection modal
- `src/__tests__/App.test.tsx` - Integration tests

## Supported Networks

| Network | Chain ID | Native Token |
|---------|----------|--------------|
| Ethereum | 1 | ETH |
| Base | 8453 | ETH |
| Polygon | 137 | MATIC |
| Arbitrum | 42161 | ETH |
| Optimism | 10 | ETH |

## Token Support

- **Native tokens**: ETH, MATIC
- **Popular stablecoins**: USDC, USDT, DAI
- **Custom tokens**: Search and select any ERC-20 token
- **Cached optimization**: USDC responses are cached for better performance

## EIP-681 URL Format

Generated URLs follow the EIP-681 standard:

### ETH Transfer
```
ethereum:0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5@1?value=1500000000000000000
```

### Token Transfer
```
ethereum:0xA0b86a33E6412CCF9B79C4a95C@1/transfer?address=0x742D35Cc6AB26DE97F7B9b9C4FD3B174C8A2C4C5&uint256=100000000
```

## Development

### Project Structure

```
src/
├── components/           # React components
│   ├── TransactionForm.tsx
│   ├── TokenSelector.tsx
│   ├── QRCodeGenerator.tsx
│   └── __tests__/       # Component tests
├── utils/               # Utility functions
│   ├── eip681.ts        # EIP-681 URL generation
│   ├── tokenSearch.ts   # Token search logic
│   ├── validation.ts    # Form validation
│   └── __tests__/       # Utility tests
├── test/               # Test configuration
│   └── setup.ts        # Test environment setup
└── __tests__/          # Integration tests
```

### Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **QR Codes**: qrcode library
- **Testing**: Vitest, Testing Library, jsdom
- **Build**: Vite with TypeScript

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run test suite
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## Deployment

This project is automatically deployed to GitHub Pages using GitHub Actions.

### Automatic Deployment

- **Trigger**: Every push to the `main` branch
- **Process**: Build → Test → Deploy to GitHub Pages
- **URL**: `https://brunobar79.github.io/eip681-link-generator-v2/`

### Manual Deployment

To deploy manually:

```bash
npm run build       # Build the application
# Upload the contents of the `dist` folder to your hosting provider
```

### GitHub Pages Setup

To enable GitHub Pages deployment for your fork:

1. Go to your repository Settings
2. Navigate to "Pages" in the sidebar
3. Under "Source", select "GitHub Actions"
4. The deployment workflow will automatically run on the next push to main

The deployment workflow includes:
- Running the full test suite before deployment
- Building the production version
- Uploading artifacts to GitHub Pages
- Automatic URL generation

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure tests pass: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Testing Guidelines

- Write tests for all new features
- Maintain test coverage above 90%
- Include both positive and negative test cases
- Test edge cases and error conditions
- Use descriptive test names and organize with `describe` blocks

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [EIP-681](https://eips.ethereum.org/EIPS/eip-681) for the payment URL standard
- [DexScreener API](https://docs.dexscreener.com/api/reference) for token data
- [ENS](https://ens.domains/) and [Basename](https://base.org/names) for avatar support 