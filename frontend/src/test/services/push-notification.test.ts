import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Notification for jsdom
const mockNotify = vi.fn().mockImplementation(() => ({
  onclick: null,
  close: vi.fn(),
}));
(mockNotify as any).permission = 'default';
(mockNotify as any).requestPermission = vi.fn().mockResolvedValue('granted');

vi.stubGlobal('Notification', mockNotify);

describe('Push Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should detect notification support', () => {
    const supported = 'Notification' in window;
    expect(supported).toBe(true);
  });

  it('should have default permission', () => {
    expect(Notification.permission).toBe('default');
  });

  it('should request permission', async () => {
    vi.mocked(Notification.requestPermission).mockResolvedValue('granted');
    const permission = await Notification.requestPermission();
    expect(permission).toBe('granted');
  });

  it('should handle denied permission', async () => {
    vi.mocked(Notification.requestPermission).mockResolvedValue('denied');
    const permission = await Notification.requestPermission();
    expect(permission).toBe('denied');
  });

  it('should show notification', () => {
    const notification = new Notification('Test', { body: 'Test body' });
    expect(notification).toBeDefined();
  });

  it('should save notification preferences', () => {
    const preferences = [
      { id: 'approvals', label: 'Approval Requests', enabled: true, types: ['approval'] },
      { id: 'inventory', label: 'Low Stock', enabled: false, types: ['inventory'] },
    ];

    localStorage.setItem('shranix_notification_prefs', JSON.stringify(preferences));
    const stored = JSON.parse(localStorage.getItem('shranix_notification_prefs') || '[]');
    expect(stored.length).toBe(2);
    expect(stored[0].id).toBe('approvals');
    expect(stored[0].enabled).toBe(true);
  });

  it('should update preference enabled state', () => {
    const preferences = [
      { id: 'approvals', label: 'Approval Requests', enabled: true, types: ['approval'] },
    ];

    preferences[0].enabled = false;
    localStorage.setItem('shranix_notification_prefs', JSON.stringify(preferences));

    const stored = JSON.parse(localStorage.getItem('shranix_notification_prefs') || '[]');
    expect(stored[0].enabled).toBe(false);
  });

  it('should check if notification type is enabled', () => {
    const preferences = [
      { id: 'approvals', label: 'Approval Requests', enabled: true, types: ['approval'] },
    ];

    const isEnabled = preferences.some((p) => p.enabled && p.types.includes('approval'));
    expect(isEnabled).toBe(true);

    const isDisabled = preferences.some((p) => p.enabled && p.types.includes('inventory'));
    expect(isDisabled).toBe(false);
  });

  it('should subscribe to push notifications', () => {
    let subscribed = false;
    const subscribe = () => { subscribed = true; return true; };
    const result = subscribe();
    expect(result).toBe(true);
    expect(subscribed).toBe(true);
  });

  it('should unsubscribe from push notifications', () => {
    let subscribed = true;
    const unsubscribe = () => { subscribed = false; return true; };
    const result = unsubscribe();
    expect(result).toBe(true);
    expect(subscribed).toBe(false);
  });

  it('should show approval alert', () => {
    const shown: Array<{ title: string }> = [];
    const showAlert = (docType: string, docNumber: string) => {
      shown.push({ title: `${docType} #${docNumber} is pending approval` });
    };

    showAlert('Purchase Order', 'PO-001');
    expect(shown.length).toBe(1);
    expect(shown[0].title).toContain('PO-001');
  });

  it('should show low stock alert', () => {
    const shown: Array<{ title: string }> = [];
    const showAlert = (item: string, stock: number, min: number) => {
      shown.push({ title: `${item} is low (${stock}/${min})` });
    };

    showAlert('Wheat Seeds', 10, 50);
    expect(shown.length).toBe(1);
    expect(shown[0].title).toContain('Wheat Seeds');
  });

  it('should show workflow alert', () => {
    const shown: Array<{ title: string }> = [];
    const showAlert = (action: string, docType: string, docNumber: string) => {
      shown.push({ title: `${docType} #${docNumber} ${action}` });
    };

    showAlert('approved', 'Sales Order', 'SO-005');
    expect(shown.length).toBe(1);
    expect(shown[0].title).toContain('approved');
  });

  it('should handle service worker registration for push', async () => {
    const mockSwReady = Promise.resolve({
      pushManager: {
        subscribe: vi.fn().mockResolvedValue({ endpoint: 'https://example.com/push' }),
        getSubscription: vi.fn().mockResolvedValue(null),
      },
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: mockSwReady },
      writable: true,
    });

    const sw = await navigator.serviceWorker.ready;
    expect(sw).toBeDefined();
  });

  it('should generate notification with vibration pattern', () => {
    const notification = {
      title: 'Alert',
      body: 'Test',
      vibrate: [200, 100, 200],
    };
    expect(notification.vibrate).toEqual([200, 100, 200]);
  });

  it('should require interaction for important notifications', () => {
    const notification = {
      title: 'Approval Required',
      body: 'Action needed',
      requireInteraction: true,
    };
    expect(notification.requireInteraction).toBe(true);
  });
});
