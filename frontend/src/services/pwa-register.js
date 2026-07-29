class PwaRegistrationService {
    registration = null;
    isInstalled = false;
    isOffline = false;
    listeners = new Set();
    updateAvailable = false;
    async register(options = {}) {
        if (!('serviceWorker' in navigator)) {
            console.warn('Service Worker not supported');
            return false;
        }
        try {
            this.registration = await navigator.serviceWorker.register(options.swPath || '/sw.js', {
                scope: '/',
                updateViaCache: 'none',
            });
            // Check if PWA is already installed
            if (window.matchMedia('(display-mode: standalone)').matches) {
                this.isInstalled = true;
            }
            // Listen for beforeinstallprompt
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                this.isInstalled = false;
            });
            // Listen for app installed
            this.registration.addEventListener('updatefound', () => {
                const newWorker = this.registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.updateAvailable = true;
                            this.notifyListeners();
                            options.onUpdate?.();
                        }
                    });
                }
            });
            // Track online/offline
            this.isOffline = !navigator.onLine;
            window.addEventListener('online', () => {
                this.isOffline = false;
                this.notifyListeners();
            });
            window.addEventListener('offline', () => {
                this.isOffline = true;
                this.notifyListeners();
            });
            if (this.registration.active) {
                this.isInstalled = true;
                options.onInstalled?.();
            }
            this.notifyListeners();
            return true;
        }
        catch (error) {
            console.error('Service Worker registration failed:', error);
            return false;
        }
    }
    async unregister() {
        if (this.registration) {
            const result = await this.registration.unregister();
            this.registration = null;
            return result;
        }
        return false;
    }
    async skipWaiting() {
        if (this.registration?.waiting) {
            this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    }
    getRegistration() {
        return this.registration;
    }
    isPwaInstalled() {
        return this.isInstalled || window.matchMedia('(display-mode: standalone)').matches;
    }
    isOnline() {
        return !this.isOffline && navigator.onLine;
    }
    hasUpdate() {
        return this.updateAvailable;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    notifyListeners() {
        const state = {
            installed: this.isInstalled,
            updated: this.updateAvailable,
            offline: this.isOffline,
            registration: this.registration,
        };
        this.listeners.forEach((listener) => listener(state));
    }
}
export const pwaService = new PwaRegistrationService();
export default pwaService;
//# sourceMappingURL=pwa-register.js.map