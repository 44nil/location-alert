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
            return await response.json();
        } catch (err) {
            console.error('Nominatim arama hatası:', err);
            throw err;
        }
    }

    static async reverseGeocode(lat, lng) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=tr`;
            const response = await fetch(url, { headers: { 'User-Agent': 'DurakAlarm/1.0' } });
            return await response.json();
        } catch (err) {
            console.error("Reverse geocoding hatası:", err);
            throw err;
        }
    }
}
