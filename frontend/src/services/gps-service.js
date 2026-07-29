class GpsService {
    watchId = null;
    currentLocation = null;
    locationHistory = [];
    listeners = new Set();
    visitHistory = [];
    isWatching = false;
    maxHistorySize = 1000;
    async getCurrentPosition(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by this browser'));
                return;
            }
            navigator.geolocation.getCurrentPosition((position) => {
                const loc = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    altitude: position.coords.altitude,
                    speed: position.coords.speed,
                    timestamp: position.timestamp,
                };
                this.currentLocation = loc;
                this.addToHistory(loc);
                resolve(loc);
            }, (error) => {
                const messages = {
                    1: 'Location permission denied. Please enable GPS access.',
                    2: 'GPS signal unavailable. Try moving to an open area.',
                    3: 'GPS request timed out.',
                };
                reject(new Error(messages[error.code] || 'GPS error'));
            }, {
                enableHighAccuracy: true,
                timeout,
                maximumAge: 30000,
            });
        });
    }
    startWatching(options = {}) {
        if (this.isWatching) {
            return;
        }
        if (!navigator.geolocation) {
            console.warn('Geolocation not supported');
            return;
        }
        if (options.maxHistory) {
            this.maxHistorySize = options.maxHistory;
        }
        this.watchId = navigator.geolocation.watchPosition((position) => {
            const loc = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude,
                speed: position.coords.speed,
                timestamp: position.timestamp,
            };
            this.currentLocation = loc;
            this.addToHistory(loc);
            this.notifyListeners(loc);
        }, (error) => {
            console.warn('GPS watch error:', error.message);
        }, {
            enableHighAccuracy: options.enableHighAccuracy ?? true,
            timeout: 15000,
            maximumAge: 10000,
        });
        this.isWatching = true;
    }
    stopWatching() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        this.isWatching = false;
    }
    getCurrentLocation() {
        return this.currentLocation;
    }
    getLocationHistory() {
        return [...this.locationHistory];
    }
    async getAddressFromLocation(lat, lng) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, { headers: { 'Accept-Language': 'en' } });
            const data = await response.json();
            return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
        catch {
            return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
    }
    // ─── Visit Tracking ─────────────────────
    async recordVisit(type, notes, photoIds) {
        let location = this.currentLocation;
        if (!location) {
            try {
                location = await this.getCurrentPosition();
            }
            catch {
                throw new Error('Cannot record visit without GPS location');
            }
        }
        let address;
        try {
            address = await this.getAddressFromLocation(location.lat, location.lng);
        }
        catch {
            // Address optional
        }
        const visit = {
            id: `visit_${Date.now()}`,
            type,
            location,
            address,
            notes,
            photoIds,
            timestamp: Date.now(),
        };
        this.visitHistory.push(visit);
        // Store in localStorage
        try {
            const stored = JSON.parse(localStorage.getItem('shranix_visits') || '[]');
            stored.push(visit);
            localStorage.setItem('shranix_visits', JSON.stringify(stored.slice(-100)));
        }
        catch {
            // Best-effort storage
        }
        return visit;
    }
    async checkIn(notes) {
        return this.recordVisit('check-in', notes);
    }
    async checkOut(notes) {
        return this.recordVisit('check-out', notes);
    }
    async verifyDelivery(notes, photoIds) {
        return this.recordVisit('delivery', notes, photoIds);
    }
    getVisitHistory() {
        return [...this.visitHistory];
    }
    getStoredVisits() {
        try {
            return JSON.parse(localStorage.getItem('shranix_visits') || '[]');
        }
        catch {
            return [];
        }
    }
    async checkProximity(targetLat, targetLng, radiusMeters = 100) {
        const location = this.currentLocation || await this.getCurrentPosition();
        const distance = this.calculateDistance(location.lat, location.lng, targetLat, targetLng);
        return {
            withinRange: distance <= radiusMeters,
            distance: Math.round(distance),
        };
    }
    // ─── Utility ─────────────────────────────
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // Earth radius in meters
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    toRad(deg) {
        return (deg * Math.PI) / 180;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    get isTracking() {
        return this.isWatching;
    }
    addToHistory(loc) {
        this.locationHistory.push(loc);
        if (this.locationHistory.length > this.maxHistorySize) {
            this.locationHistory = this.locationHistory.slice(-this.maxHistorySize);
        }
    }
    notifyListeners(location) {
        this.listeners.forEach((listener) => listener(location));
    }
}
export const gpsService = new GpsService();
export default gpsService;
//# sourceMappingURL=gps-service.js.map