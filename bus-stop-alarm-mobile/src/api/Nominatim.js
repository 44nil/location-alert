// ============================================================
// Nominatim.js — OpenStreetMap API Interactions
// ============================================================

export class Nominatim {
    static async searchLocation(query, selectedCity) {
        try {
            let searchQuery = query;
            if (selectedCity) {
                searchQuery = `${query}, ${selectedCity}`;
            }
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=6&countrycodes=tr&accept-language=tr&addressdetails=1`;
            const response = await fetch(url, {
                headers: { 'User-Agent': 'DurakAlarm/1.0' }
            });
            if (!response.ok) {
                console.warn('Nominatim arama hatası:', response.status, response.statusText);
                return [];
            }
            return await response.json();
        } catch (err) {
            console.warn('Nominatim arama hatası:', err);
            return [];
        }
    }
    static async reverseGeocode(lat, lng) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=tr`;
            const response = await fetch(url, { headers: { 'User-Agent': 'DurakAlarm/1.0' } });
            if (!response.ok) {
                console.warn('Reverse geocoding hatası:', response.status, response.statusText);
                return null;
            }
            return await response.json();
        } catch (err) {
            console.warn('Reverse geocoding hatası:', err);
            return null;
        }
    }
}
