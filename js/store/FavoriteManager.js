import { STOPS } from './Constants.js';

export class FavoriteManager {
    constructor() { this.STORAGE_KEY = 'durak_alarm_destination_favorites_v2'; }

    getAll() {
        const d = localStorage.getItem(this.STORAGE_KEY);
        const parsed = d ? JSON.parse(d) : [];
        // Geriye dönük uyumluluk ve bozuk verileri filtreleme (önceki bug'dan kalan sadece ID olan veriler)
        return parsed.filter(item => item && typeof item === 'object' && item.id);
    }

    add(poiObj) {
        const f = this.getAll();
        if (!f.find(item => item.id === poiObj.id)) {
            f.push(poiObj);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(f));
        }
    }

    remove(poiId) {
        const f = this.getAll().filter(item => item.id !== poiId);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(f));
    }

    isFavorite(poiId) {
        return this.getAll().some(item => item.id === poiId);
    }

    getFavoriteStops() {
        return this.getAll();
    }
}

export function getStopById(id) {
    // Önce aktif STOPS listesine bak, yoksa favorilerde ara
    const found = STOPS.find(s => s.id === id);
    if (found) return found;

    const fm = new FavoriteManager();
    return fm.getAll().find(s => s.id === id);
}
