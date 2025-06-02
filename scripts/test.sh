#!/bin/bash

# Test runner script for Ethereum Payment Link Generator v2
# Usage: ./scripts/test.sh [option]

set -e

echo "🧪 Ethereum Payment Link Generator v2 - Test Suite"
echo "=================================================="

case "$1" in
  "unit")
    echo "Running unit tests..."
    npm test -- --run --reporter=verbose src/utils/__tests__/
    ;;
  "components")
    echo "Running component tests..."
    npm test -- --run --reporter=verbose src/components/__tests__/
    ;;
  "integration")
    echo "Running integration tests..."
    npm test -- --run --reporter=verbose src/__tests__/
    ;;
  "coverage")
    echo "Running tests with coverage report..."
    npm run test:coverage
    ;;
  "watch")
    echo "Running tests in watch mode..."
    npm run test:watch
    ;;
  "all")
    echo "Running all tests..."
    npm test -- --run --reporter=verbose
    ;;
  "validate")
    echo "Running validation tests..."
    npm test -- --run --reporter=verbose src/utils/__tests__/validation.test.ts
    ;;
  "eip681")
    echo "Running EIP-681 tests..."
    npm test -- --run --reporter=verbose src/utils/__tests__/eip681.test.ts
    ;;
  "tokens")
    echo "Running token search tests..."
    npm test -- --run --reporter=verbose src/utils/__tests__/tokenSearch.test.ts
    ;;
  "form")
    echo "Running transaction form tests..."
    npm test -- --run --reporter=verbose src/components/__tests__/TransactionForm.test.tsx
    ;;
  "selector")
    echo "Running token selector tests..."
    npm test -- --run --reporter=verbose src/components/__tests__/TokenSelector.test.tsx
    ;;
  "app")
    echo "Running app integration tests..."
    npm test -- --run --reporter=verbose src/__tests__/App.test.tsx
    ;;
  "ci")
    echo "Running CI test suite..."
    npm run type-check
    npm run lint
    npm test -- --run --reporter=basic
    npm run build
    echo "✅ CI tests passed!"
    ;;
  "help"|*)
    echo "Available test options:"
    echo ""
    echo "  unit         - Run utility function tests"
    echo "  components   - Run React component tests"
    echo "  integration  - Run integration tests"
    echo "  coverage     - Run tests with coverage report"
    echo "  watch        - Run tests in watch mode"
    echo "  all          - Run all tests"
    echo ""
    echo "Specific test files:"
    echo "  validate     - Validation utility tests"
    echo "  eip681       - EIP-681 URL generation tests"
    echo "  tokens       - Token search functionality tests"
    echo "  form         - Transaction form component tests"
    echo "  selector     - Token selector component tests"
    echo "  app          - App integration tests"
    echo ""
    echo "Special:"
    echo "  ci           - Run full CI test suite (type-check, lint, test, build)"
    echo "  help         - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./scripts/test.sh all        # Run all tests"
    echo "  ./scripts/test.sh coverage   # Run with coverage"
    echo "  ./scripts/test.sh ci         # Full CI suite"
    echo "  ./scripts/test.sh eip681     # Just EIP-681 tests"
    ;;
esac 