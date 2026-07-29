import { describe, it, expect, vi, beforeEach } from 'vitest';
// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    })),
    writable: true,
});
describe('useResponsive hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('should detect mobile device type', () => {
        const width = 375;
        const deviceType = width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
        expect(deviceType).toBe('mobile');
    });
    it('should detect tablet device type', () => {
        const width = 768;
        const deviceType = width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
        expect(deviceType).toBe('tablet');
    });
    it('should detect desktop device type', () => {
        const width = 1440;
        const deviceType = width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
        expect(deviceType).toBe('desktop');
    });
    it('should detect portrait orientation', () => {
        const height = 812;
        const width = 375;
        const orientation = height > width ? 'portrait' : 'landscape';
        expect(orientation).toBe('portrait');
    });
    it('should detect landscape orientation', () => {
        const height = 375;
        const width = 812;
        const orientation = height > width ? 'portrait' : 'landscape';
        expect(orientation).toBe('landscape');
    });
    it('should show bottom nav on mobile', () => {
        const width = 375;
        const hasBottomNav = width < 640;
        expect(hasBottomNav).toBe(true);
    });
    it('should hide sidebar on mobile', () => {
        const width = 375;
        const showSidebar = width >= 640;
        expect(showSidebar).toBe(false);
    });
    it('should show sidebar on desktop', () => {
        const width = 1440;
        const showSidebar = width >= 640;
        expect(showSidebar).toBe(true);
    });
    it('should detect touch device', () => {
        const isTouchDevice = 'ontouchstart' in window;
        expect(typeof isTouchDevice).toBe('boolean');
    });
    it('should detect standalone PWA mode', () => {
        const mq = window.matchMedia('(display-mode: standalone)');
        expect(mq.matches).toBe(false);
    });
    it('should provide safe area insets', () => {
        const style = getComputedStyle(document.documentElement);
        const sat = parseInt(style.getPropertyValue('--sat') || '0', 10);
        const sab = parseInt(style.getPropertyValue('--sab') || '0', 10);
        expect(typeof sat).toBe('number');
        expect(typeof sab).toBe('number');
    });
});
//# sourceMappingURL=useResponsive.test.js.map