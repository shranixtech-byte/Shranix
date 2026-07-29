type PwaStateListener = (state: {
    installed: boolean;
    updated: boolean;
    offline: boolean;
    registration: ServiceWorkerRegistration | null;
}) => void;
interface PwaRegisterOptions {
    onUpdate?: () => void;
    onInstalled?: () => void;
    swPath?: string;
}
declare class PwaRegistrationService {
    private registration;
    private isInstalled;
    private isOffline;
    private listeners;
    private updateAvailable;
    register(options?: PwaRegisterOptions): Promise<boolean>;
    unregister(): Promise<boolean>;
    skipWaiting(): Promise<void>;
    getRegistration(): ServiceWorkerRegistration | null;
    isPwaInstalled(): boolean;
    isOnline(): boolean;
    hasUpdate(): boolean;
    subscribe(listener: PwaStateListener): () => void;
    private notifyListeners;
}
export declare const pwaService: PwaRegistrationService;
export default pwaService;
//# sourceMappingURL=pwa-register.d.ts.map