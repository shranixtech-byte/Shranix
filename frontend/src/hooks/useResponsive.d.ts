type DeviceType = 'mobile' | 'tablet' | 'desktop';
type Orientation = 'portrait' | 'landscape';
interface ResponsiveInfo {
    deviceType: DeviceType;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    orientation: Orientation;
    width: number;
    height: number;
    isTouchDevice: boolean;
    hasBottomNav: boolean;
    showSidebar: boolean;
    isStandalone: boolean;
    safeAreaTop: number;
    safeAreaBottom: number;
}
export declare function useResponsive(): ResponsiveInfo;
export declare function useBottomNavVisible(): boolean;
export declare function useIsStandalone(): boolean;
export declare function useOnlineStatus(): boolean;
export declare function useNetworkQuality(): {
    type: string;
    downlink: number;
    rtt: number;
};
export {};
//# sourceMappingURL=useResponsive.d.ts.map