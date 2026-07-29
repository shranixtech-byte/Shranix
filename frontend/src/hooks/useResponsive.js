import { useState, useEffect } from 'react';
function getDeviceType(width) {
    if (width < 640) {
        return 'mobile';
    }
    if (width < 1024) {
        return 'tablet';
    }
    return 'desktop';
}
function getOrientation() {
    if (typeof window === 'undefined') {
        return 'portrait';
    }
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}
function getSafeAreas() {
    if (typeof window === 'undefined') {
        return { top: 0, bottom: 0 };
    }
    const style = getComputedStyle(document.documentElement);
    return {
        top: parseInt(style.getPropertyValue('--sat') || '0', 10),
        bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
    };
}
export function useResponsive() {
    const [info, setInfo] = useState(() => {
        const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
        const deviceType = getDeviceType(width);
        return {
            deviceType,
            isMobile: deviceType === 'mobile',
            isTablet: deviceType === 'tablet',
            isDesktop: deviceType === 'desktop',
            orientation: getOrientation(),
            width,
            height: typeof window !== 'undefined' ? window.innerHeight : 768,
            isTouchDevice: typeof window !== 'undefined' && 'ontouchstart' in window,
            hasBottomNav: deviceType === 'mobile',
            showSidebar: deviceType !== 'mobile',
            isStandalone: typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches,
            safeAreaTop: getSafeAreas().top,
            safeAreaBottom: getSafeAreas().bottom,
        };
    });
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const deviceType = getDeviceType(width);
            setInfo({
                deviceType,
                isMobile: deviceType === 'mobile',
                isTablet: deviceType === 'tablet',
                isDesktop: deviceType === 'desktop',
                orientation: getOrientation(),
                width,
                height: window.innerHeight,
                isTouchDevice: 'ontouchstart' in window,
                hasBottomNav: deviceType === 'mobile',
                showSidebar: deviceType !== 'mobile',
                isStandalone: window.matchMedia('(display-mode: standalone)').matches,
                safeAreaTop: getSafeAreas().top,
                safeAreaBottom: getSafeAreas().bottom,
            });
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        // Listen for orientation changes
        const orientationHandler = () => handleResize();
        window.addEventListener('orientationchange', orientationHandler);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', orientationHandler);
        };
    }, []);
    return info;
}
export function useBottomNavVisible() {
    const [visible, setVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            setVisible(currentScrollY < lastScrollY || currentScrollY < 50);
            setLastScrollY(currentScrollY);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);
    return visible;
}
export function useIsStandalone() {
    const [standalone, setStandalone] = useState(typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches);
    useEffect(() => {
        const mq = window.matchMedia('(display-mode: standalone)');
        const handler = (e) => setStandalone(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);
    return standalone;
}
export function useOnlineStatus() {
    const [online, setOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
    useEffect(() => {
        const goOnline = () => setOnline(true);
        const goOffline = () => setOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);
    return online;
}
export function useNetworkQuality() {
    const [quality, setQuality] = useState({
        type: 'unknown',
        downlink: 10,
        rtt: 0,
    });
    useEffect(() => {
        if ('connection' in navigator) {
            const conn = navigator.connection;
            const updateQuality = () => {
                setQuality({
                    type: conn.effectiveType || 'unknown',
                    downlink: conn.downlink || 10,
                    rtt: conn.rtt || 0,
                });
            };
            updateQuality();
            conn.addEventListener('change', updateQuality);
            return () => conn.removeEventListener('change', updateQuality);
        }
    }, []);
    return quality;
}
//# sourceMappingURL=useResponsive.js.map