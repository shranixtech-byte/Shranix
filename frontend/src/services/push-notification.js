const DEFAULT_PREFERENCES = [
    { id: 'approvals', label: 'Approval Requests', description: 'When someone requests your approval', enabled: true, types: ['approval'] },
    { id: 'workflow', label: 'Workflow Updates', description: 'When a workflow step is completed', enabled: true, types: ['workflow'] },
    { id: 'inventory', label: 'Low Stock Alerts', description: 'When inventory items reach low stock threshold', enabled: true, types: ['inventory'] },
    { id: 'purchase', label: 'Purchase Alerts', description: 'Purchase order updates and supplier activity', enabled: true, types: ['purchase'] },
    { id: 'sales', label: 'Sales Alerts', description: 'Sales order updates and customer activity', enabled: true, types: ['sales'] },
    { id: 'reminders', label: 'Reminders', description: 'Payment reminders and task due dates', enabled: true, types: ['reminder'] },
];
class PushNotificationService {
    swRegistration = null;
    listeners = new Set();
    permission = 'default';
    isSubscribed = false;
    preferences = [...DEFAULT_PREFERENCES];
    async init() {
        if (!('Notification' in window)) {
            console.warn('Notifications not supported');
            return false;
        }
        this.permission = Notification.permission;
        // Load preferences
        try {
            const stored = localStorage.getItem('shranix_notification_prefs');
            if (stored) {
                this.preferences = JSON.parse(stored);
            }
        }
        catch {
            // Use defaults
        }
        // Get SW registration
        if ('serviceWorker' in navigator) {
            this.swRegistration = await navigator.serviceWorker.ready;
        }
        return true;
    }
    async requestPermission() {
        if (this.permission === 'granted') {
            return true;
        }
        try {
            const result = await Notification.requestPermission();
            this.permission = result;
            return result === 'granted';
        }
        catch {
            return false;
        }
    }
    async subscribe() {
        if (!this.swRegistration) {
            await this.init();
        }
        if (!this.swRegistration) {
            return false;
        }
        if (this.isSubscribed) {
            return true;
        }
        try {
            // In production, set up VAPID keys and subscribe via pushManager
            // For now, mark as subscribed
            this.isSubscribed = true;
            localStorage.setItem('shranix_push_subscribed', 'true');
            return true;
        }
        catch {
            return false;
        }
    }
    async unsubscribe() {
        if (!this.swRegistration) {
            return false;
        }
        try {
            const subscription = await this.swRegistration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
            }
            this.isSubscribed = false;
            localStorage.setItem('shranix_push_subscribed', 'false');
            return true;
        }
        catch {
            return false;
        }
    }
    // ─── In-App Notifications ─────────────
    showNotification(payload) {
        // Notify in-app listeners
        this.notifyListeners({
            title: payload.title,
            body: payload.body,
            data: payload.data,
        });
        // Show native notification
        if (this.permission === 'granted') {
            try {
                const notification = new Notification(payload.title, {
                    body: payload.body,
                    icon: payload.icon || '/logo.png',
                    badge: payload.badge || '/logo.png',
                    tag: payload.tag,
                    data: payload.data,
                    requireInteraction: payload.requireInteraction,
                });
                notification.onclick = () => {
                    window.focus();
                    if (payload.data?.url) {
                        window.location.href = payload.data.url;
                    }
                    notification.close();
                };
            }
            catch {
                // Fallback
            }
        }
        // Notify in-app listeners
        this.notifyListeners({
            title: payload.title,
            body: payload.body,
            data: payload.data,
        });
    }
    showApprovalAlert(docType, docNumber, url) {
        if (!this.isEnabled('approval')) {
            return;
        }
        this.showNotification({
            title: 'Approval Required',
            body: `${docType} #${docNumber} is pending your approval`,
            tag: `approval-${docNumber}`,
            data: { url, type: 'approval' },
            requireInteraction: true,
            vibrate: [200, 100, 200],
        });
    }
    showLowStockAlert(itemName, currentStock, minStock) {
        if (!this.isEnabled('inventory')) {
            return;
        }
        this.showNotification({
            title: 'Low Stock Alert',
            body: `${itemName} is running low (${currentStock}/${minStock})`,
            tag: `stock-${itemName}`,
            data: { url: '/inventory/items', type: 'inventory' },
            vibrate: [100, 50, 100],
        });
    }
    showWorkflowAlert(action, docType, docNumber) {
        if (!this.isEnabled('workflow')) {
            return;
        }
        this.showNotification({
            title: `Workflow ${action}`,
            body: `${docType} #${docNumber} has been ${action}`,
            tag: `wf-${docNumber}`,
            data: { url: '/workflow/dashboard', type: 'workflow' },
            vibrate: [100],
        });
    }
    showReminder(title, body, url) {
        if (!this.isEnabled('reminder')) {
            return;
        }
        this.showNotification({
            title,
            body,
            tag: `reminder-${Date.now()}`,
            data: { url, type: 'reminder' },
            requireInteraction: true,
        });
    }
    // ─── Preferences ──────────────────────
    getPreferences() {
        return [...this.preferences];
    }
    updatePreference(id, enabled) {
        const pref = this.preferences.find((p) => p.id === id);
        if (pref) {
            pref.enabled = enabled;
            localStorage.setItem('shranix_notification_prefs', JSON.stringify(this.preferences));
        }
    }
    isEnabled(type) {
        return this.preferences.some((p) => p.enabled && p.types.includes(type));
    }
    get hasPermission() {
        return this.permission === 'granted';
    }
    get subscribed() {
        return this.isSubscribed;
    }
    onNotification(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    notifyListeners(notification) {
        this.listeners.forEach((listener) => listener(notification));
    }
}
export const pushService = new PushNotificationService();
export default pushService;
//# sourceMappingURL=push-notification.js.map