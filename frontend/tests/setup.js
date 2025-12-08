import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock du DOM global
global.document = document;
global.window = window;
global.navigator = navigator;

// Mock pour les APIs du navigateur
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock pour localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock pour sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock pour fetch
global.fetch = vi.fn();

// Mock pour requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 0);
  return 1;
});

// Mock pour cancelAnimationFrame
global.cancelAnimationFrame = vi.fn();

// Nettoyer après chaque test
afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

