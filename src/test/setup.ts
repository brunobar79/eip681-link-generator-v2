import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock matchMedia for components that use responsive features
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((_query) => ({
    matches: vi.fn(),
    media: vi.fn(),
    onchange: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation((_callback: any) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: vi.fn().mockImplementation((_query) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
})

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
    readText: vi.fn().mockImplementation(() => Promise.resolve('')),
  },
})

// Mock fetch globally
global.fetch = vi.fn()

const { getComputedStyle } = window
window.getComputedStyle = vi.fn().mockImplementation(
  (elt) => getComputedStyle(elt)
)

// Mock HTMLElement.prototype.scrollIntoView
HTMLElement.prototype.scrollIntoView = vi.fn()
Element.prototype.scrollIntoView = vi.fn()

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
}) 