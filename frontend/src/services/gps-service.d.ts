interface GeoLocation {
    lat: number;
    lng: number;
    accuracy: number;
    altitude: number | null;
    speed: number | null;
    timestamp: number;
}
interface VisitRecord {
    id: string;
    type: 'check-in' | 'check-out' | 'delivery' | 'field-visit';
    location: GeoLocation;
    address?: string;
    notes?: string;
    photoIds?: string[];
    timestamp: number;
}
type GeoLocationListener = (location: GeoLocation) => void;
declare class GpsService {
    private watchId;
    private currentLocation;
    private locationHistory;
    private listeners;
    private visitHistory;
    private isWatching;
    private maxHistorySize;
    getCurrentPosition(timeout?: number): Promise<GeoLocation>;
    startWatching(options?: {
        enableHighAccuracy?: boolean;
        maxHistory?: number;
    }): void;
    stopWatching(): void;
    getCurrentLocation(): GeoLocation | null;
    getLocationHistory(): GeoLocation[];
    getAddressFromLocation(lat: number, lng: number): Promise<string>;
    recordVisit(type: VisitRecord['type'], notes?: string, photoIds?: string[]): Promise<VisitRecord>;
    checkIn(notes?: string): Promise<VisitRecord>;
    checkOut(notes?: string): Promise<VisitRecord>;
    verifyDelivery(notes?: string, photoIds?: string[]): Promise<VisitRecord>;
    getVisitHistory(): VisitRecord[];
    getStoredVisits(): VisitRecord[];
    checkProximity(targetLat: number, targetLng: number, radiusMeters?: number): Promise<{
        withinRange: boolean;
        distance: number;
    }>;
    calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number;
    private toRad;
    subscribe(listener: GeoLocationListener): () => void;
    get isTracking(): boolean;
    private addToHistory;
    private notifyListeners;
}
export declare const gpsService: GpsService;
export default gpsService;
//# sourceMappingURL=gps-service.d.ts.map