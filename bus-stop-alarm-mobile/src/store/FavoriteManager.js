import AsyncStorage from '@react-native-async-storage/async-storage';
import { STOPS } from './Constants.js';

export class FavoriteManager {
    constructor() {
        this.STORAGE_KEY = 'durak_alarm_destination_favorites_rn_v1';
        this.cache = [];
    }

    async load() {
        try {
            const d = await AsyncStorage.getItem(this.STORAGE_KEY);
            const parsed = d ? JSON.parse(d) : [];
            this.cache = parsed.filter(item => item && typeof item === 'object' && item.id);
        } catch (e) {
            console.error("Failed to load favorites", e);
            this.cache = [];
        }
        return this.cache;
    }

    getAll() {
        return this.cache;
    }

    async add(poiObj) {
        if (!this.cache.find(item => item.id === poiObj.id)) {
            this.cache.push(poiObj);
            await this.save();
        }
    }

    async remove(poiId) {
        this.cache = this.cache.filter(item => item.id !== poiId);
        await this.save();
    }

    async save() {
        try {
            await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache));
        } catch (e) {
            console.error("Failed to save favorites", e);
        }
    }

    isFavorite(poiId) {
        return this.cache.some(item => item.id === poiId);
    }
}

export async function getStopByIdAsync(id, favManager) {
    const found = STOPS.find(s => s.id === id);
    if (found) return found;

    if (!favManager) return null;
    return favManager.getAll().find(s => s.id === id);
}
