interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, unknown>;
    requireInteraction?: boolean;
    vibrate?: number[];
}
interface NotificationPreference {
    id: string;
    label: string;
    description: string;
    enabled: boolean;
    types: ('approval' | 'workflow' | 'inventory' | 'purchase' | 'sales' | 'reminder')[];
}
type NotificationListener = (notification: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
}) => void;
declare class PushNotificationService {
    private swRegistration;
    private listeners;
    private permission;
    private isSubscribed;
    private preferences;
    init(): Promise<boolean>;
    requestPermission(): Promise<boolean>;
    subscribe(): Promise<boolean>;
    unsubscribe(): Promise<boolean>;
    showNotification(payload: NotificationPayload): void;
    showApprovalAlert(docType: string, docNumber: string, url?: string): void;
    showLowStockAlert(itemName: string, currentStock: number, minStock: number): void;
    showWorkflowAlert(action: string, docType: string, docNumber: string): void;
    showReminder(title: string, body: string, url?: string): void;
    getPreferences(): NotificationPreference[];
    updatePreference(id: string, enabled: boolean): void;
    isEnabled(type: NotificationPreference['types'][number]): boolean;
    get hasPermission(): boolean;
    get subscribed(): boolean;
    onNotification(listener: NotificationListener): () => void;
    private notifyListeners;
}
export declare const pushService: PushNotificationService;
export default pushService;
//# sourceMappingURL=push-notification.d.ts.map