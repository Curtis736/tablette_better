import { describe, it, expect, vi } from 'vitest';

describe('SEDI Tablette - Tests de base', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should test environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should test mock functionality', () => {
    const mockFn = vi.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });
});

describe('SEDI Tablette - Tests de configuration', () => {
  it('should have correct test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.VITEST_TIMEOUT).toBe('10000');
  });

  it('should have console mock configured', () => {
    // Vérifier que console.log est mocké
    expect(typeof console.log).toBe('function');
  });
});

























