import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Global mock for chains module
vi.mock('../data/chains', () => {
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
    },
    {
      chainId: 137,
      name: 'Polygon Mainnet',
      chain: 'Polygon',
      shortName: 'matic',
      networkId: 137,
      rpc: [{ url: 'https://polygon.llamarpc.com' }],
      faucets: [],
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      infoURL: 'https://polygon.technology',
      icon: 'polygon',
      explorers: [{ name: 'PolygonScan', url: 'https://polygonscan.com' }],
    },
  ];

  const getChainsAsyncMock = vi.fn().mockResolvedValue(mockChains);
  
  return {
    CHAINS: mockChains,
    getChains: vi.fn().mockResolvedValue(mockChains),
    getChainById: vi.fn((id: number) => mockChains.find(chain => chain.chainId === id)),
    getChainByName: vi.fn((name: string) => mockChains.find(chain => chain.name.includes(name))),
    getMainnets: vi.fn(() => mockChains),
    getTestnets: vi.fn(() => []),
    getChainsAsync: getChainsAsyncMock,
    getChainIcon: vi.fn(() => 'https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg'),
  };
});

// Mock browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock clipboard API with proper spy
const writeTextSpy = vi.fn(() => Promise.resolve())
const readTextSpy = vi.fn(() => Promise.resolve(''))

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: writeTextSpy,
    readText: readTextSpy,
  },
  writable: true,
  configurable: true,
})

// Create a comprehensive CSS style mock
const createCSSStyleMock = () => {
  const style: Record<string, string> = {
    position: 'static',
    top: '0px',
    left: '0px',
    right: '0px',
    bottom: '0px',
    width: '0px',
    height: '0px',
    margin: '0px',
    padding: '0px',
    border: '0px',
    outline: '0px',
    display: 'block',
    visibility: 'visible',
    opacity: '1',
    zIndex: 'auto',
    pointerEvents: 'auto',
    overflow: 'visible',
    fontSize: '16px',
    fontFamily: 'Arial',
    color: 'rgb(0, 0, 0)',
    backgroundColor: 'rgba(0, 0, 0, 0)',
    backgroundImage: 'none',
    textAlign: 'left',
    lineHeight: 'normal',
    transform: 'none',
    transition: 'none',
    animation: 'none',
    cursor: 'auto',
    userSelect: 'auto',
    boxSizing: 'content-box',
    float: 'none',
    clear: 'none',
    flex: '0 1 auto',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    alignContent: 'stretch',
    order: '0',
    flexGrow: '0',
    flexShrink: '1',
    flexBasis: 'auto',
    alignSelf: 'auto',
    gridColumn: 'auto',
    gridRow: 'auto',
    gridArea: 'auto',
    listStyle: 'none',
    textDecoration: 'none',
    textTransform: 'none',
    whiteSpace: 'normal',
    wordBreak: 'normal',
    overflowWrap: 'normal'
  }

  // Create a proxy to handle property access
  return new Proxy(style, {
    get(target, prop) {
      if (prop === 'getPropertyValue') {
        return (property: string) => target[property] || ''
      }
      if (prop === 'setProperty') {
        return (property: string, value: string) => {
          target[property] = value
        }
      }
      if (prop === 'removeProperty') {
        return (property: string) => {
          delete target[property]
        }
      }
      if (prop === 'length') {
        return Object.keys(target).length
      }
      if (prop === 'cssText') {
        return ''
      }
      return target[prop as string] || ''
    },
    set(target, prop, value) {
      target[prop as string] = value
      return true
    }
  })
}

// Mock getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: vi.fn(() => createCSSStyleMock()),
  writable: true,
})

// Mock element prototype methods
Element.prototype.scrollIntoView = vi.fn()
Element.prototype.getBoundingClientRect = vi.fn(() => ({
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  width: 0,
  height: 0,
  x: 0,
  y: 0,
  toJSON: () => {},
}))

// Mock element properties
Object.defineProperty(Element.prototype, 'offsetWidth', {
  configurable: true,
  value: 100,
})

Object.defineProperty(Element.prototype, 'offsetHeight', {
  configurable: true,
  value: 100,
})

Object.defineProperty(Element.prototype, 'clientWidth', {
  configurable: true,
  value: 100,
})

Object.defineProperty(Element.prototype, 'clientHeight', {
  configurable: true,
  value: 100,
})

Object.defineProperty(Element.prototype, 'scrollWidth', {
  configurable: true,
  value: 100,
})

Object.defineProperty(Element.prototype, 'scrollHeight', {
  configurable: true,
  value: 100,
})

Object.defineProperty(Element.prototype, 'offsetTop', {
  configurable: true,
  value: 0,
})

Object.defineProperty(Element.prototype, 'offsetLeft', {
  configurable: true,
  value: 0,
})

// Mock scroll methods
Element.prototype.scroll = vi.fn() as any
Element.prototype.scrollTo = vi.fn() as any
Element.prototype.scrollBy = vi.fn() as any

// Mock HTMLElement methods
if (typeof HTMLElement !== 'undefined') {
  HTMLElement.prototype.click = vi.fn()
  HTMLElement.prototype.focus = vi.fn()
  HTMLElement.prototype.blur = vi.fn()
}

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
}) 