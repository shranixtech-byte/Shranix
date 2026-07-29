interface BiometricOptions {
    onSuccess?: () => void;
    onError?: (error: string) => void;
}
export declare function useBiometric(options?: BiometricOptions): {
    authenticate: () => Promise<boolean>;
    reset: () => void;
    checkAvailability: () => Promise<void>;
    isAvailable: boolean;
    isAuthenticated: boolean;
    isEnrolled: boolean;
    biometricType: "fingerprint" | "face" | "iris" | "none";
    error: string | null;
};
export declare function useDeviceRegistration(): {
    deviceId: string | null;
    deviceName: string;
    trusted: boolean;
    markTrusted: () => void;
    removeTrust: () => void;
};
export {};
//# sourceMappingURL=useBiometric.d.ts.map