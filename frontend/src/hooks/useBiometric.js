import { useState, useCallback, useEffect } from 'react';
function detectBiometricType() {
    if (typeof window === 'undefined') {
        return 'none';
    }
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('face') || ua.includes('faceid')) {
        return 'face';
    }
    if (ua.includes('finger') || ua.includes('touch') || ua.includes('biometric')) {
        return 'fingerprint';
    }
    return 'none';
}
export function useBiometric(options) {
    const [state, setState] = useState({
        isAvailable: false,
        isAuthenticated: false,
        isEnrolled: false,
        biometricType: detectBiometricType(),
        error: null,
    });
    useEffect(() => {
        checkAvailability();
    }, []);
    const checkAvailability = useCallback(async () => {
        // Check WebAuthn / Credential Management API
        const webAuthnAvailable = typeof window !== 'undefined' &&
            typeof PublicKeyCredential !== 'undefined';
        if (webAuthnAvailable) {
            try {
                const isUserVerifyingPlatformAuthenticatorAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                const isConditionalMediationAvailable = typeof PublicKeyCredential.isConditionalMediationAvailable === 'function'
                    ? await PublicKeyCredential.isConditionalMediationAvailable()
                    : false;
                setState({
                    isAvailable: isUserVerifyingPlatformAuthenticatorAvailable,
                    isAuthenticated: false,
                    isEnrolled: isConditionalMediationAvailable,
                    biometricType: detectBiometricType(),
                    error: null,
                });
            }
            catch {
                setState((prev) => ({
                    ...prev,
                    isAvailable: false,
                    error: 'Biometric check failed',
                }));
            }
        }
    }, []);
    const authenticate = useCallback(async () => {
        setState((prev) => ({ ...prev, error: null }));
        try {
            // Try WebAuthn first
            if (typeof PublicKeyCredential !== 'undefined') {
                const credential = await navigator.credentials.get({
                    publicKey: {
                        challenge: new Uint8Array(32),
                        rpId: window.location.hostname,
                        userVerification: 'required',
                        timeout: 60000,
                    },
                });
                if (credential) {
                    setState((prev) => ({
                        ...prev,
                        isAuthenticated: true,
                        error: null,
                    }));
                    options?.onSuccess?.();
                    return true;
                }
            }
            // Fallback to local auth pin
            const pin = prompt('Enter your security PIN to verify identity:');
            if (pin && pin.length >= 4) {
                setState((prev) => ({
                    ...prev,
                    isAuthenticated: true,
                    error: null,
                }));
                options?.onSuccess?.();
                return true;
            }
            throw new Error('Authentication cancelled');
        }
        catch (error) {
            const message = error.message || 'Biometric authentication failed';
            setState((prev) => ({
                ...prev,
                isAuthenticated: false,
                error: message,
            }));
            options?.onError?.(message);
            return false;
        }
    }, [options]);
    const reset = useCallback(() => {
        setState((prev) => ({
            ...prev,
            isAuthenticated: false,
            error: null,
        }));
    }, []);
    return {
        ...state,
        authenticate,
        reset,
        checkAvailability,
    };
}
export function useDeviceRegistration() {
    const [deviceId, setDeviceId] = useState(null);
    const [deviceName, setDeviceName] = useState('');
    const [trusted, setTrusted] = useState(false);
    useEffect(() => {
        // Generate or retrieve device ID
        let stored = localStorage.getItem('shranix_device_id');
        if (!stored) {
            stored = crypto.randomUUID?.() || `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            localStorage.setItem('shranix_device_id', stored);
        }
        setDeviceId(stored);
        // Get device name
        const ua = navigator.userAgent;
        const isMobile = /mobile|android|iphone|ipad/i.test(ua);
        const os = /android/i.test(ua) ? 'Android' : /iphone|ipad/i.test(ua) ? 'iOS' : /windows/i.test(ua) ? 'Windows' : 'Unknown';
        setDeviceName(`${isMobile ? 'Mobile' : 'Desktop'} - ${os}`);
        // Check if device is trusted
        const trustedDevices = JSON.parse(localStorage.getItem('shranix_trusted_devices') || '[]');
        setTrusted(trustedDevices.includes(stored));
    }, []);
    const markTrusted = useCallback(() => {
        if (!deviceId) {
            return;
        }
        const trustedDevices = JSON.parse(localStorage.getItem('shranix_trusted_devices') || '[]');
        if (!trustedDevices.includes(deviceId)) {
            trustedDevices.push(deviceId);
            localStorage.setItem('shranix_trusted_devices', JSON.stringify(trustedDevices));
            setTrusted(true);
        }
    }, [deviceId]);
    const removeTrust = useCallback(() => {
        if (!deviceId) {
            return;
        }
        const trustedDevices = JSON.parse(localStorage.getItem('shranix_trusted_devices') || '[]');
        const filtered = trustedDevices.filter((id) => id !== deviceId);
        localStorage.setItem('shranix_trusted_devices', JSON.stringify(filtered));
        setTrusted(false);
    }, [deviceId]);
    return { deviceId, deviceName, trusted, markTrusted, removeTrust };
}
//# sourceMappingURL=useBiometric.js.map