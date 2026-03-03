// ============================================================
// app.js — Ana Uygulama Kontrolcüsü
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    const app = new DurakAlarmApp();
    app.init();
});

class DurakAlarmApp {
    constructor() {
        this.map = null;
        this.markers = [];
        this.userMarker = null;
        this.geofenceCircle = null;
        this.favManager = new FavoriteManager();
        this.alarmManager = new AlarmManager();
        this.selectedCity = '';

        // DOM refs
        this.dom = {
            bottomSheet: document.getElementById('bottomSheet'),
            sheetHandle: document.getElementById('sheetHandle'),
            alarmCard: document.getElementById('alarmCard'),
            alarmDot: document.getElementById('alarmDot'),
            alarmStatusText: document.getElementById('alarmStatusText'),
            alarmStopName: document.getElementById('alarmStopName'),
            alarmStopLines: document.getElementById('alarmStopLines'),
            alarmDistanceFill: document.getElementById('alarmDistanceFill'),
            alarmDistanceValue: document.getElementById('alarmDistanceValue'),
            alarmAccuracy: document.getElementById('alarmAccuracy'),
            alarmAccuracyText: document.getElementById('alarmAccuracyText'),
            alarmClose: document.getElementById('alarmClose'),
            favoritesList: document.getElementById('favoritesList'),
            emptyFavs: document.getElementById('emptyFavs'),
            favCount: document.getElementById('favCount'),
            settingsModal: document.getElementById('settingsModal'),
            distanceSlider: document.getElementById('distanceSlider'),
            distanceValue: document.getElementById('distanceValue'),
            headphoneToggle: document.getElementById('headphoneToggle'),
            vibrationToggle: document.getElementById('vibrationToggle'),
            alarmOverlay: document.getElementById('alarmOverlay'),
            alarmTriggeredStop: document.getElementById('alarmTriggeredStop'),
            toast: document.getElementById('toast'),
            locationSearchInput: document.getElementById('locationSearchInput'),
            locationSearchResults: document.getElementById('locationSearchResults'),
            mapLoadingOverlay: document.getElementById('mapLoadingOverlay'),
        };
    }

    // ============================================================
    // Init
    // ============================================================
    init() {
        this.initMap();
        this.initCitySelector();
        this.initLocationSearch();
        this.initBottomSheet();
        this.initSettings();
        this.initAlarmCallbacks();
        this.renderFavorites();
        this.bindEvents();
        this.loadSettings();

        // Try to get user location
        this.locateUser();
    }

    // ============================================================
    // Map
    // ============================================================
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

        // Attribution bottom-right
        L.control.attribution({ position: 'bottomright', prefix: false })
            .addAttribution('© <a href="https://www.openstreetmap.org/">OSM</a> | © <a href="https://carto.com/">CARTO</a>')
            .addTo(this.map);

        // Map click => Reverse Geocoding => Drop Pin
        this.map.on('click', e => this._handleMapClick(e));
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

        // Önce favorileri çiz
        const favs = this.favManager.getFavoriteStops();
        favs.forEach(stop => {
            this._addSingleMarker(stop);
            renderedIds.add(stop.id);
        });

        // Sonra aktif arama sonuçlarını (STOPS) çiz
        STOPS.forEach(stop => {
            if (!renderedIds.has(stop.id)) {
                this._addSingleMarker(stop);
                renderedIds.add(stop.id);
            }
        });
    }

    createPopupContent(stop) {
        const isFav = this.favManager.isFavorite(stop.id);
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
            marker.setPopupContent(this.createPopupContent(stop));
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

    clearMarkerHighlights() {
        this.markers.forEach(m => {
            const el = m.getElement()?.querySelector('.stop-marker');
            if (el) el.classList.remove('active', 'alarm-active');
        });
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

    // ============================================================
    // User Location
    // ============================================================
    locateUser() {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            pos => {
                const { latitude, longitude } = pos.coords;
                this.setUserMarker(latitude, longitude);
                this.map.flyTo([latitude, longitude], 14, { duration: 1.2 });
            },
            () => {
                // Default: Istanbul center
                this.showToast('📍 Konum alınamadı, İstanbul görünümü yüklendi', 'info');
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

    // ============================================================
    // City Selector
    // ============================================================
    initCitySelector() {
        const select = document.getElementById('citySelect');
        getCityList().forEach(city => {
            const opt = document.createElement('option');
            opt.value = city;
            opt.textContent = city;
            select.appendChild(opt);
        });

        select.addEventListener('change', () => {
            this.selectedCity = select.value;
            if (select.value && CITIES[select.value]) {
                const c = CITIES[select.value];
                this.map.flyTo([c.lat, c.lng], 13, { duration: 1 });
            } else {
                this.map.flyTo([39.0, 35.0], 6, { duration: 1 });
            }
        });
    }

    // ============================================================
    // Search
    // ============================================================
    initSearch() {
        const searchInput = this.dom.searchInput;
        const searchResults = this.dom.searchResults;

        searchInput.addEventListener('input', () => {
            const q = searchInput.value.trim();
            if (q.length < 2) {
                searchResults.classList.remove('active');
                return;
            }

            const results = searchStops(q, this.selectedCity || null);
            if (results.length === 0) {
                searchResults.innerHTML = `
          <div class="search-result-item">
            <div class="result-icon">🔍</div>
            <div class="result-info">
              <div class="result-name" style="color:var(--white-50)">Sonuç bulunamadı</div>
            </div>
          </div>
        `;
            } else {
                searchResults.innerHTML = results.slice(0, 8).map(stop => `
          <div class="search-result-item" data-stop-id="${stop.id}">
            <div class="result-icon">🚏</div>
            <div class="result-info">
              <div class="result-name">${stop.name}</div>
              <div class="result-lines">📍 ${stop.city}</div>
            </div>
          </div>
        `).join('');
            }
            searchResults.classList.add('active');
        });

        searchResults.addEventListener('click', e => {
            const item = e.target.closest('.search-result-item');
            if (!item) return;
            const stopId = parseInt(item.dataset.stopId);
            if (!stopId) return;

            const stop = getStopById(stopId);
            if (stop) {
                this.map.flyTo([stop.lat, stop.lng], 16, { duration: 0.8 });
                const marker = this.markers.find(m => m.stopData.id === stopId);
                if (marker) marker.openPopup();
            }

            searchInput.value = '';
            searchResults.classList.remove('active');
        });

        // Close search on outside click
        document.addEventListener('click', e => {
            if (!e.target.closest('.search-container')) {
                searchResults.classList.remove('active');
            }
        });

        searchInput.addEventListener('focus', () => {
            this.expandSheet();
        });
    }

    // ============================================================
    // Bottom Sheet
    // ============================================================
    initBottomSheet() {
        const handle = this.dom.sheetHandle;
        const sheet = this.dom.bottomSheet;
        let startY = 0, startTranslate = 0;

        handle.addEventListener('click', () => {
            sheet.classList.toggle('expanded');
            sheet.classList.remove('minimized');
        });

        // Touch drag
        handle.addEventListener('touchstart', e => {
            startY = e.touches[0].clientY;
        }, { passive: true });

        handle.addEventListener('touchmove', e => {
            const dy = e.touches[0].clientY - startY;
            if (dy < -50) this.expandSheet();
            else if (dy > 50) this.collapseSheet();
        }, { passive: true });
    }

    expandSheet() {
        this.dom.bottomSheet.classList.add('expanded');
        this.dom.bottomSheet.classList.remove('minimized');
    }

    collapseSheet() {
        this.dom.bottomSheet.classList.remove('expanded');
        this.dom.bottomSheet.classList.remove('minimized');
    }

    minimizeSheet() {
        this.dom.bottomSheet.classList.add('minimized');
        this.dom.bottomSheet.classList.remove('expanded');
    }

    // ============================================================
    // Favorites
    // ============================================================
    renderFavorites() {
        const favs = this.favManager.getFavoriteStops();
        this.dom.favCount.textContent = favs.length;

        if (favs.length === 0) {
            this.dom.emptyFavs.style.display = 'block';
            // Remove fav items but keep empty state
            const items = this.dom.favoritesList.querySelectorAll('.favorite-item');
            items.forEach(i => i.remove());
            return;
        }

        this.dom.emptyFavs.style.display = 'none';

        // Remove old items
        const oldItems = this.dom.favoritesList.querySelectorAll('.favorite-item');
        oldItems.forEach(i => i.remove());

        favs.forEach(stop => {
            const el = document.createElement('div');
            el.className = 'favorite-item';
            el.innerHTML = `
        <div class="fav-icon-wrap">🚏</div>
        <div class="fav-info">
          <div class="fav-name">${stop.name}</div>
          <div class="fav-lines">📍 ${stop.city}</div>
        </div>
        <div class="fav-actions">
          <button class="fav-action-btn alarm" title="Alarm Kur" data-stop-id="${stop.id}">🔔</button>
          <button class="fav-action-btn remove" title="Kaldır" data-stop-id="${stop.id}">✕</button>
        </div>
      `;

            el.querySelector('.fav-action-btn.alarm').addEventListener('click', e => {
                e.stopPropagation();
                this.setAlarmForStop(stop.id);
            });

            el.querySelector('.fav-action-btn.remove').addEventListener('click', e => {
                e.stopPropagation();
                this.toggleFavorite(stop.id);
            });

            el.addEventListener('click', () => {
                this.map.flyTo([stop.lat, stop.lng], 16, { duration: 0.8 });
                const marker = this.markers.find(m => m.stopData.id === stop.id);
                if (marker) setTimeout(() => marker.openPopup(), 500);
                this.collapseSheet();
            });

            this.dom.favoritesList.appendChild(el);
        });
    }

    toggleFavorite(stopId) {
        if (this.favManager.isFavorite(stopId)) {
            this.favManager.remove(stopId);
            this.showToast('⭐ Favorilerden çıkarıldı', 'info');
        } else {
            const stop = getStopById(stopId);
            if (stop) {
                this.favManager.add(stop);
                this.showToast(`⭐ ${stop.name} favorilere eklendi`, 'success');
            }
        }
        this.renderFavorites();
        this.updateMarkerPopup(stopId);
    }

    // ============================================================
    // Alarm
    // ============================================================
    setAlarmForStop(stopId) {
        const stop = getStopById(stopId);
        if (!stop) return;

        this.map.closePopup();

        // Show alarm card
        this.dom.alarmCard.classList.add('active');
        this.dom.alarmStopName.textContent = stop.name;
        this.dom.alarmStopLines.textContent = '📍 ' + stop.city;
        this.dom.alarmDistanceValue.textContent = 'Hesaplanıyor...';
        this.dom.alarmDistanceFill.style.width = '0%';
        this.dom.alarmDot.className = 'alarm-dot';
        this.dom.alarmStatusText.textContent = 'Takip Ediliyor';

        // Highlight marker & show geofence
        this.highlightMarker(stopId);
        this.showGeofenceCircle(stop, this.alarmManager.settings.distance);

        // Fly to stop
        this.map.flyTo([stop.lat, stop.lng], 14, { duration: 1 });

        this.showToast(`🔔 "${stop.name}" için alarm kuruldu`, 'success');

        // Start REAL location tracking instead of demo simulation
        this.alarmManager.setAlarm(stop);
    }

    startDemoAlarm(stopId) {
        const stop = getStopById(stopId);
        if (!stop) return;

        this.map.closePopup();

        // Show alarm card for DEMO
        this.dom.alarmCard.classList.add('active');
        this.dom.alarmStopName.textContent = "[DEMO] " + stop.name;
        this.dom.alarmStopLines.textContent = '📍 ' + stop.city;
        this.dom.alarmDistanceValue.textContent = 'Demo Başlıyor...';
        this.dom.alarmDistanceFill.style.width = '0%';
        this.dom.alarmDot.className = 'alarm-dot';
        this.dom.alarmStatusText.textContent = 'Simülasyon Aktif';

        this.highlightMarker(stopId);
        this.showGeofenceCircle(stop, this.alarmManager.settings.distance);
        this.map.flyTo([stop.lat, stop.lng], 14, { duration: 1 });

        this.showToast(`🚀 Demo Modu: "${stop.name}"`, 'info');
        this.alarmManager.startDemo(stop);
    }

    initAlarmCallbacks() {
        this.alarmManager.onDistanceUpdate = (distance, accuracy, stop) => {
            const distStr = distance > 1000
                ? (distance / 1000).toFixed(1) + ' km'
                : Math.round(distance) + ' m';

            this.dom.alarmDistanceValue.textContent = distStr;

            // Progress bar (2000m → 0m)
            const pct = Math.max(0, Math.min(100, ((2000 - distance) / 2000) * 100));
            this.dom.alarmDistanceFill.style.width = pct + '%';

            // Accuracy indicator
            const accDot = this.dom.alarmAccuracy.querySelector('.accuracy-dot');
            accDot.className = 'accuracy-dot';
            if (accuracy === 'düşük') {
                accDot.classList.add('low');
                this.dom.alarmAccuracyText.textContent = 'Düşük Hassasiyet';
            } else if (accuracy === 'orta') {
                accDot.classList.add('mid');
                this.dom.alarmAccuracyText.textContent = 'Orta Hassasiyet';
            } else {
                accDot.classList.add('high');
                this.dom.alarmAccuracyText.textContent = 'Yüksek Hassasiyet';
            }

            // Update status
            if (distance <= this.alarmManager.settings.distance * 1.5 && distance > this.alarmManager.settings.distance) {
                this.dom.alarmDot.className = 'alarm-dot approaching';
                this.dom.alarmStatusText.textContent = 'Yaklaşıyorsunuz!';
                this.dom.alarmDistanceFill.style.background = 'linear-gradient(90deg, #F39C12, #F1C40F)';
            }
        };

        this.alarmManager.onStatusChange = (status, stop) => {
            if (status === 'approaching') {
                this.dom.alarmDot.className = 'alarm-dot approaching';
                this.dom.alarmStatusText.textContent = 'Yaklaşıyorsunuz!';
                this.showToast('⚠️ Durağınıza yaklaşıyorsunuz!', 'warning');
            } else if (status === 'idle') {
                this.dom.alarmCard.classList.remove('active');
                this.clearMarkerHighlights();
                this.removeGeofenceCircle();
            }
        };

        this.alarmManager.onAlarmTriggered = (soundPlayed, reason) => {
            const stop = this.alarmManager.activeAlarm?.stop;
            this.dom.alarmDot.className = 'alarm-dot triggered';
            this.dom.alarmStatusText.textContent = 'ALARM!';

            // Show full-screen overlay
            if (stop) {
                this.dom.alarmTriggeredStop.textContent = stop.name;
            }
            this.dom.alarmOverlay.classList.add('active');

            if (reason === 'headphone_required') {
                this.showToast('🎧 Kulaklık takılı değil — sadece titreşim gönderildi', 'warning');
            }
        };

        // Dismiss alarm
        document.getElementById('alarmDismiss').addEventListener('click', () => {
            this.dom.alarmOverlay.classList.remove('active');
            this.alarmManager.clearDemo();
            this.dom.alarmCard.classList.remove('active');
            this.clearMarkerHighlights();
            this.removeGeofenceCircle();
            this.showToast('✅ İyi yolculuklar!', 'success');
        });

        this.dom.alarmClose.addEventListener('click', () => {
            this.alarmManager.clearDemo();
            this.dom.alarmCard.classList.remove('active');
            this.clearMarkerHighlights();
            this.removeGeofenceCircle();
            this.showToast('🔕 Alarm iptal edildi', 'info');
        });
    }

    // ============================================================
    // Settings
    // ============================================================
    initSettings() {
        const modal = this.dom.settingsModal;

        document.getElementById('btnSettings').addEventListener('click', () => {
            modal.classList.add('active');
        });

        document.getElementById('settingsClose').addEventListener('click', () => {
            modal.classList.remove('active');
        });

        modal.addEventListener('click', e => {
            if (e.target === modal) modal.classList.remove('active');
        });

        // Distance slider
        this.dom.distanceSlider.addEventListener('input', e => {
            const val = parseInt(e.target.value);
            this.dom.distanceValue.textContent = val + 'm';
            this.alarmManager.saveSettings({ distance: val });
            // Update geofence circle if active
            if (this.alarmManager.activeAlarm) {
                this.showGeofenceCircle(this.alarmManager.activeAlarm.stop, val);
            }
        });

        // Headphone toggle
        this.dom.headphoneToggle.addEventListener('change', e => {
            this.alarmManager.saveSettings({ headphoneOnly: e.target.checked });
            this.showToast(
                e.target.checked ? '🎧 Sadece kulaklık modu açıldı' : '🔊 Hoparlörden de çalacak',
                'info'
            );
        });

        // Vibration toggle
        this.dom.vibrationToggle.addEventListener('change', e => {
            this.alarmManager.saveSettings({ vibration: e.target.checked });
        });

        // Sound type
        document.querySelectorAll('.sound-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.sound-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.alarmManager.saveSettings({ soundType: btn.dataset.sound });

                // Play preview
                this.previewSound(btn.dataset.sound);
            });
        });
    }

    loadSettings() {
        const s = this.alarmManager.settings;
        this.dom.distanceSlider.value = s.distance;
        this.dom.distanceValue.textContent = s.distance + 'm';
        this.dom.headphoneToggle.checked = s.headphoneOnly;
        this.dom.vibrationToggle.checked = s.vibration;

        document.querySelectorAll('.sound-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.sound === s.soundType);
        });
    }

    previewSound(type) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        switch (type) {
            case 'melody': osc.type = 'sine'; osc.frequency.value = 659; break;
            case 'beep': osc.type = 'square'; osc.frequency.value = 880; break;
            case 'chime': osc.type = 'triangle'; osc.frequency.value = 1046; break;
        }

        gain.gain.value = 0.15;
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
    }

    // ============================================================
    // Quick Actions
    // ============================================================
    bindEvents() {
        // Global ref for popup buttons
        window._app = this;

        // Locate me
        document.getElementById('btnLocate').addEventListener('click', () => {
            this.locateUser();
        });

        // Demo button
        document.getElementById('btnDemo').addEventListener('click', () => {
            const favs = this.favManager.getFavoriteStops();
            const pool = favs.length > 0 ? favs : STOPS;
            if (pool.length > 0) {
                const randomStop = pool[Math.floor(Math.random() * pool.length)];
                this.startDemoAlarm(randomStop.id);
            } else {
                this.showToast('⚠️ Demo için önce bir hedef seçin veya favori ekleyin', 'warning');
            }
        });

        // All stops — zoom to Turkey or selected city
        document.getElementById('btnAllStops').addEventListener('click', () => {
            if (this.selectedCity && CITIES[this.selectedCity]) {
                const c = CITIES[this.selectedCity];
                this.map.flyTo([c.lat, c.lng], 13, { duration: 1 });
            } else {
                this.map.flyTo([39.0, 35.0], 6, { duration: 1 });
            }
            this.expandSheet();
        });

        // Nearby
        document.getElementById('btnNearby').addEventListener('click', () => {
            this.showNearbyStops();
        });
    }

    showNearbyStops() {
        // Use map center as reference
        const center = this.map.getCenter();
        const withDist = STOPS.map(s => ({
            ...s,
            dist: this.alarmManager.haversine(center.lat, center.lng, s.lat, s.lng)
        })).sort((a, b) => a.dist - b.dist);

        const nearby = withDist.slice(0, 8);

        this.dom.nearbyScroll.innerHTML = nearby.map(s => `
      <div class="nearby-card" data-stop-id="${s.id}">
        <div class="nearby-card-name">${s.name}</div>
        <div class="nearby-card-lines">📍 ${s.city}</div>
        <div class="nearby-card-distance">${s.dist > 1000 ? (s.dist / 1000).toFixed(1) + ' km' : Math.round(s.dist) + ' m'
            }</div>
      </div>
    `).join('');

        this.dom.nearbySection.style.display = 'block';
        this.expandSheet();

        this.dom.nearbyScroll.querySelectorAll('.nearby-card').forEach(card => {
            card.addEventListener('click', () => {
                const sid = parseInt(card.dataset.stopId);
                const stop = getStopById(sid);
                if (stop) {
                    this.map.flyTo([stop.lat, stop.lng], 16, { duration: 0.8 });
                    const marker = this.markers.find(m => m.stopData.id === sid);
                    if (marker) setTimeout(() => marker.openPopup(), 500);
                    this.collapseSheet();
                }
            });
        });
    }

    // ============================================================
    // Toast
    // ============================================================
    showToast(message, type = 'info') {
        const t = this.dom.toast;
        t.textContent = message;
        t.className = `toast ${type}`;
        requestAnimationFrame(() => t.classList.add('show'));

        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            t.classList.remove('show');
        }, 3000);
    }

    // ============================================================
    // Location Search (Nominatim Geocoding)
    // ============================================================
    initLocationSearch() {
        const input = this.dom.locationSearchInput;
        const results = this.dom.locationSearchResults;
        let debounceTimer = null;

        input.addEventListener('input', () => {
            const q = input.value.trim();
            if (q.length < 2) {
                results.classList.remove('active');
                return;
            }

            // Debounce — Nominatim'e çok sık istek atma
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => this._searchLocation(q, results), 500);
        });

        results.addEventListener('click', e => {
            const item = e.target.closest('.search-result-item');
            if (!item) return;

            const lat = parseFloat(item.dataset.lat);
            const lng = parseFloat(item.dataset.lng);
            const name = item.dataset.name;

            if (!isNaN(lat) && !isNaN(lng)) {
                // Sadece hedef pinini düşür (Kullanıcı konumunu bozma)
                this.map.flyTo([lat, lng], 15, { duration: 1.2 });
                this.showToast(`📍 Hedef ayarlandı: ${name}`, 'success');

                // Hedef pimi düşür
                this._setDestinationMarker(lat, lng, name, item.querySelector('.result-lines').textContent.replace('📍 ', ''));
            }

            input.value = '';
            results.classList.remove('active');
        });

        // Dış tıklama ile kapat
        document.addEventListener('click', e => {
            if (!e.target.closest('.location-search-container')) {
                results.classList.remove('active');
            }
        });

        input.addEventListener('focus', () => {
            this.expandSheet();
        });
    }

    async _searchLocation(query, resultsEl) {
        try {
            let searchQuery = query;
            if (this.selectedCity) {
                searchQuery = `${query}, ${this.selectedCity}`;
            }
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=6&countrycodes=tr&accept-language=tr&addressdetails=1`;
            const response = await fetch(url, {
                headers: { 'User-Agent': 'DurakAlarm/1.0' }
            });
            const data = await response.json();

            if (data.length === 0) {
                resultsEl.innerHTML = `
                    <div class="search-result-item">
                        <div class="result-icon">📍</div>
                        <div class="result-info">
                            <div class="result-name" style="color:var(--white-50)">Konum bulunamadı</div>
                        </div>
                    </div>
                `;
            } else {
                resultsEl.innerHTML = data.map(place => {
                    const shortName = place.display_name.split(',').slice(0, 2).join(', ');
                    return `
                        <div class="search-result-item" data-lat="${place.lat}" data-lng="${place.lon}" data-name="${shortName}">
                            <div class="result-icon">📍</div>
                            <div class="result-info">
                                <div class="result-name">${shortName}</div>
                                <div class="result-lines">${place.display_name.split(',').slice(2, 4).join(', ')}</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            resultsEl.classList.add('active');
        } catch (err) {
            console.error('Nominatim arama hatası:', err);
        }
    }

    async _handleMapClick(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        this.showMapLoading();
        this.showToast('⏳ Konum bilgisi alınıyor...', 'info');

        try {
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=tr`;
            const response = await fetch(url, { headers: { 'User-Agent': 'DurakAlarm/1.0' } });
            const data = await response.json();

            let name = "Seçilen Konum";
            let city = "Bilinmeyen Yer";

            if (data && data.address) {
                name = data.name || data.address.road || data.address.suburb || "Seçilen Konum";
                city = data.address.city || data.address.town || data.address.province || data.address.state || "Bilinmeyen Yer";
            }

            this.map.flyTo([lat, lng], 15, { duration: 0.8 });
            this._setDestinationMarker(lat, lng, name, city);
            this.showToast(`📍 Hedef: ${name}`, 'success');
        } catch (err) {
            console.error("Reverse geocoding hatası:", err);
            this._setDestinationMarker(lat, lng, "Seçilen Konum", `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            this.showToast('📍 Konum işaretlendi', 'success');
        } finally {
            this.hideMapLoading();
        }
    }

    _setDestinationMarker(lat, lng, name, city) {
        // Yeni bir POI (Point of Interest) objesi oluştur
        const id = Date.now();
        const poi = {
            id: id,
            name: name,
            city: city,
            lat: lat,
            lng: lng,
            lines: [] // geriye dönük uyumluluk
        };

        // Sadece tek bir arama sonucunu STOPS'ta tut
        STOPS = [poi];

        // Favorileri ve yeni pimi haritada göster
        this.refreshMarkers();

        // Pimin popup'ını otomatik aç
        setTimeout(() => {
            const marker = this.markers.find(m => m.stopData.id === id);
            if (marker) marker.openPopup();
        }, 500);
    }

    showMapLoading() {
        this.dom.mapLoadingOverlay.classList.add('active');
    }

    hideMapLoading() {
        this.dom.mapLoadingOverlay.classList.remove('active');
    }
}
