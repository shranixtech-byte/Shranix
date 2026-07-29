import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock service worker
const mockRegister = vi.fn().mockResolvedValue({
  installing: null,
  waiting: null,
  active: {} as ServiceWorker,
  addEventListener: vi.fn(),
  unregister: vi.fn().mockResolvedValue(true),
});

Object.defineProperty(navigator, 'serviceWorker', {
  value: { register: mockRegister },
  writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
  writable: true,
});

describe('PWA Registration Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect service worker support', () => {
    expect('serviceWorker' in navigator).toBe(true);
  });

  it('should register service worker', async () => {
    const result = await navigator.serviceWorker.register('/sw.js');
    expect(result).toBeDefined();
    expect(mockRegister).toHaveBeenCalledWith('/sw.js');
  });

  it('should check PWA install status', () => {
    const mq = window.matchMedia('(display-mode: standalone)');
    expect(mq.matches).toBe(false);
  });

  it('should detect online status', () => {
    expect(navigator.onLine).toBe(true);
  });

  it('should handle service worker unregister', async () => {
    const registration = await navigator.serviceWorker.register('/sw.js');
    const result = await registration.unregister();
    expect(result).toBe(true);
  });
});
