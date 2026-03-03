// ============================================================
// MapManager.js — Leaflet Map Controls and Markers
// ============================================================
import * as L from 'leaflet';
import { STOPS, resetStops } from '../store/Constants.js';
import { getStopById } from '../store/FavoriteManager.js';
import { Nominatim } from '../api/Nominatim.js';

export class MapManager {
    constructor(appContext) {
        this.app = appContext; // Reference to main app for callbacks (toast, alarm)
        this.map = null;
        this.markers = [];
        this.userMarker = null;
        this.geofenceCircle = null;
    }

    initMap() {
        this.map = L.map('map', {
            center: [39.0, 35.0], // Turkey center
            zoom: 6,
            zoomControl: false,
            attributionControl: false,
        });

        // Dark-ish tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
        }).addTo(this.map);

        // Zoom control → right side
        L.control.zoom({ position: 'topright' }).addTo(this.map);

        // Map click => Reverse Geocoding => Drop Pin
        this.map.on('click', e => this._handleMapClick(e));
    }

    async _handleMapClick(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        this.app.showMapLoading();
        this.app.showToast('⏳ Konum bilgisi alınıyor...', 'info');

        try {
            const data = await Nominatim.reverseGeocode(lat, lng);
            let name = "Seçilen Konum";
            let city = "Bilinmeyen Yer";

            if (data && data.address) {
                name = data.name || data.address.road || data.address.suburb || "Seçilen Konum";
                city = data.address.city || data.address.town || data.address.province || data.address.state || "Bilinmeyen Yer";
            }

            this.map.flyTo([lat, lng], 15, { duration: 0.8 });
            this._setDestinationMarker(lat, lng, name, city);
            this.app.showToast(`📍 Hedef: ${name}`, 'success');
        } catch (err) {
            console.error(err);
            this._setDestinationMarker(lat, lng, "Seçilen Konum", `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            this.app.showToast('📍 Konum işaretlendi', 'success');
        } finally {
            this.app.hideMapLoading();
        }
    }

    _setDestinationMarker(lat, lng, name, city) {
        const id = Date.now();
        const poi = { id, name, city, lat, lng, lines: [] };

        // Sadece tek bir arama sonucunu STOPS'ta tut
        resetStops([poi]);

        this.refreshMarkers();

        setTimeout(() => {
            const marker = this.markers.find(m => m.stopData.id === id);
            if (marker) marker.openPopup();
        }, 500);
    }

    _addSingleMarker(stop) {
        const icon = L.divIcon({
            className: 'stop-marker-container',
            html: '<div class="stop-marker"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 24],
        });

        const marker = L.marker([stop.lat, stop.lng], { icon }).addTo(this.map);

        marker.bindPopup(this.createPopupContent(stop), {
            closeButton: false,
            className: 'stop-popup-wrapper',
        });

        marker.on('click', () => {
            this.map.flyTo([stop.lat, stop.lng], 15, { duration: 0.8 });
        });

        marker.stopData = stop;
        this.markers.push(marker);
    }

    clearMarkers() {
        this.markers.forEach(m => this.map.removeLayer(m));
        this.markers = [];
    }

    refreshMarkers() {
        this.clearMarkers();
        const renderedIds = new Set();

        const favs = this.app.favManager.getFavoriteStops();
        favs.forEach(stop => {
            this._addSingleMarker(stop);
            renderedIds.add(stop.id);
        });

        // Ensure active alarm stop is rendered even if not in favorites or current STOPS
        const activeAlarm = this.app.alarmManager.activeAlarm;
        if (activeAlarm && activeAlarm.stop) {
            if (!renderedIds.has(activeAlarm.stop.id)) {
                this._addSingleMarker(activeAlarm.stop);
                renderedIds.add(activeAlarm.stop.id);
            }
        }

        STOPS.forEach(stop => {
            if (!renderedIds.has(stop.id)) {
                this._addSingleMarker(stop);
                renderedIds.add(stop.id);
            }
        });
    }

    createPopupContent(stop) {
        const isFav = this.app.favManager.isFavorite(stop.id);
        // Using global window callback mapping or event dispatching. 
        // For ES modules, we attach to window so inline onclick works, 
        // or better yet, move to event listeners instead of inline onclick.
        return `
      <div class="stop-popup">
        <div class="popup-name">${stop.name}</div>
        <div class="popup-lines">📍 ${stop.city}</div>
        <button class="popup-btn alarm-btn" onclick="window._app.setAlarmForStop(${stop.id})">
          🔔 Alarm Kur
        </button>
        <button class="popup-btn fav-btn ${isFav ? 'is-fav' : ''}" 
                onclick="window._app.toggleFavorite(${stop.id})">
          ${isFav ? '★' : '☆'}
        </button>
      </div>
    `;
    }

    updateMarkerPopup(stopId) {
        const marker = this.markers.find(m => m.stopData.id === stopId);
        if (marker) {
            const stop = getStopById(stopId);
            if (stop) marker.setPopupContent(this.createPopupContent(stop));
        }
    }

    highlightMarker(stopId) {
        this.markers.forEach(m => {
            const el = m.getElement()?.querySelector('.stop-marker');
            if (el) el.classList.remove('active', 'alarm-active');
        });
        const marker = this.markers.find(m => m.stopData.id === stopId);
        if (marker) {
            const el = marker.getElement()?.querySelector('.stop-marker');
            if (el) el.classList.add('alarm-active');
        }
    }

    // Geofence circle on map
    showGeofenceCircle(stop, radius) {
        this.removeGeofenceCircle();
        this.geofenceCircle = L.circle([stop.lat, stop.lng], {
            radius: radius,
            color: '#4DA8DA',
            fillColor: '#4DA8DA',
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '6 4',
        }).addTo(this.map);
    }

    removeGeofenceCircle() {
        if (this.geofenceCircle) {
            this.map.removeLayer(this.geofenceCircle);
            this.geofenceCircle = null;
        }
    }

    locateUser() {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            pos => {
                const { latitude, longitude } = pos.coords;
                this.setUserMarker(latitude, longitude);
                this.map.flyTo([latitude, longitude], 14, { duration: 1.2 });
            },
            () => {
                this.app.showToast('📍 Konum alınamadı, İstanbul görünümü yüklendi', 'info');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    setUserMarker(lat, lng) {
        if (this.userMarker) {
            this.userMarker.setLatLng([lat, lng]);
        } else {
            const icon = L.divIcon({
                className: 'user-marker',
                iconSize: [18, 18],
                iconAnchor: [9, 9],
            });
            this.userMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(this.map);
        }
    }

    flyTo(lat, lng, zoom, options) {
        this.map.flyTo([lat, lng], zoom, options);
    }
}
