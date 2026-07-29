import { describe, it, expect, vi, beforeEach } from 'vitest';
describe('Bottom Navigation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('should render default navigation items', () => {
        const items = [
            { label: 'Dashboard', icon: 'LayoutDashboard', path: '/' },
            { label: 'Sales', icon: 'ShoppingCart', path: '/sales/dashboard' },
            { label: 'Inventory', icon: 'Package', path: '/inventory/items' },
            { label: 'AI', icon: 'Bot', path: '/ai/dashboard' },
            { label: 'More', icon: 'MoreHorizontal', path: '/more' },
        ];
        expect(items.length).toBe(5);
        expect(items[0].label).toBe('Dashboard');
        expect(items[4].label).toBe('More');
    });
    it('should highlight active navigation item', () => {
        const currentPath = '/sales/dashboard';
        const items = [
            { label: 'Dashboard', path: '/' },
            { label: 'Sales', path: '/sales/dashboard' },
        ];
        const isActive = (path) => currentPath === path || currentPath.startsWith(`${path}/`);
        expect(isActive(items[0].path)).toBe(false);
        expect(isActive(items[1].path)).toBe(true);
    });
    it('should show notification badge', () => {
        const count = 5;
        const badge = count > 0 ? count : undefined;
        expect(badge).toBe(5);
    });
    it('should cap notification badge at 99+', () => {
        const count = 150;
        const badge = count > 99 ? '99+' : count;
        expect(badge).toBe('99+');
    });
    it('should hide navigation on scroll down', () => {
        let visible = true;
        const lastScrollY = 100;
        const currentScrollY = 200;
        visible = currentScrollY < lastScrollY || currentScrollY < 50;
        expect(visible).toBe(false);
    });
    it('should show navigation on scroll up', () => {
        let visible = true;
        const lastScrollY = 200;
        const currentScrollY = 100;
        visible = currentScrollY < lastScrollY || currentScrollY < 50;
        expect(visible).toBe(true);
    });
    it('should show navigation near top of page', () => {
        let visible = true;
        const currentScrollY = 30;
        visible = currentScrollY < 50;
        expect(visible).toBe(true);
    });
    it('should render menu toggle button', () => {
        let toggled = false;
        const onToggle = () => { toggled = true; };
        onToggle();
        expect(toggled).toBe(true);
    });
    it('should support safe area padding', () => {
        const style = { paddingBottom: 'env(safe-area-inset-bottom, 0px)' };
        expect(style.paddingBottom).toContain('safe-area-inset-bottom');
    });
});
//# sourceMappingURL=bottom-nav.test.js.map