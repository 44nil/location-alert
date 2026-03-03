// ============================================================
// UIManager.js — DOM Interactions and UI State
// ============================================================
import { STOPS, CITIES, getCityList, resetStops } from '../store/Constants.js';
import { getStopById } from '../store/FavoriteManager.js';
import { Nominatim } from '../api/Nominatim.js';

export class UIManager {
    constructor(appContext) {
        this.app = appContext;
        this.toastTimer = null;
        this.selectedCity = '';

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
            nearbyScroll: document.getElementById('nearbyScroll'),
            nearbySection: document.getElementById('nearbySection'),
            searchInput: document.getElementById('searchInput'),
            searchResults: document.getElementById('searchResults')
        };
    }

    init() {
        this.initBottomSheet();
        this.initCitySelector();
        this.initLocationSearch();
        this.initSearch();
        this.initSettings();
        this.bindEvents();
    }

    // ============================================================
    // Bottom Sheet
    // ============================================================
    initBottomSheet() {
        const handle = this.dom.sheetHandle;
        const sheet = this.dom.bottomSheet;
        let startY = 0;

        if (!handle || !sheet) return;

        handle.addEventListener('click', () => {
            sheet.classList.toggle('expanded');
            sheet.classList.remove('minimized');
        });

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
        this.dom.bottomSheet?.classList.add('expanded');
        this.dom.bottomSheet?.classList.remove('minimized');
    }

    collapseSheet() {
        this.dom.bottomSheet?.classList.remove('expanded');
        this.dom.bottomSheet?.classList.remove('minimized');
    }

    minimizeSheet() {
        this.dom.bottomSheet?.classList.add('minimized');
        this.dom.bottomSheet?.classList.remove('expanded');
    }

    // ============================================================
    // Toast
    // ============================================================
    showToast(message, type = 'info') {
        const t = this.dom.toast;
        if (!t) return;
        t.textContent = message;
        t.className = `toast ${type}`;
        requestAnimationFrame(() => t.classList.add('show'));

        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            t.classList.remove('show');
        }, 3000);
    }

    showMapLoading() {
        this.dom.mapLoadingOverlay?.classList.add('active');
    }

    hideMapLoading() {
        this.dom.mapLoadingOverlay?.classList.remove('active');
    }

    // ============================================================
    // City Selector
    // ============================================================
    initCitySelector() {
        const select = document.getElementById('citySelect');
        if (!select) return;

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
                this.app.mapManager.flyTo(c.lat, c.lng, 13, { duration: 1 });
            } else {
                this.app.mapManager.flyTo(39.0, 35.0, 6, { duration: 1 });
            }
        });
    }

    // ============================================================
    // Location Search (Nominatim Geocoding)
    // ============================================================
    initLocationSearch() {
        const input = this.dom.locationSearchInput;
        const results = this.dom.locationSearchResults;
        if (!input || !results) return;

        let debounceTimer = null;

        input.addEventListener('input', () => {
            const q = input.value.trim();
            if (q.length < 2) {
                results.classList.remove('active');
                return;
            }

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => this._searchNominatim(q, results), 500);
        });

        results.addEventListener('click', e => {
            const item = e.target.closest('.search-result-item');
            if (!item) return;

            const lat = parseFloat(item.dataset.lat);
            const lng = parseFloat(item.dataset.lng);
            const name = item.dataset.name;

            if (!isNaN(lat) && !isNaN(lng)) {
                this.app.mapManager.flyTo(lat, lng, 15, { duration: 1.2 });
                this.showToast(`📍 Hedef ayarlandı: ${name}`, 'success');
                this.app.mapManager._setDestinationMarker(lat, lng, name, item.querySelector('.result-lines').textContent.replace('📍 ', ''));
            }

            input.value = '';
            results.classList.remove('active');
        });

        document.addEventListener('click', e => {
            if (!e.target.closest('.location-search-container')) {
                results.classList.remove('active');
            }
        });

        input.addEventListener('focus', () => {
            this.expandSheet();
        });
    }

    async _searchNominatim(query, resultsEl) {
        try {
            const data = await Nominatim.searchLocation(query, this.selectedCity);

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
            console.error(err);
        }
    }

    // ============================================================
    // Simple Local Search (Mock Stops)
    // ============================================================
    initSearch() {
        const searchInput = this.dom.searchInput;
        const searchResults = this.dom.searchResults;
        if (!searchInput || !searchResults) return;

        searchInput.addEventListener('input', () => {
            const q = searchInput.value.trim().toLowerCase();
            if (q.length < 2) {
                searchResults.classList.remove('active');
                return;
            }

            // Simple filter over STOPS
            const results = STOPS.filter(s => {
                const queryMatch = s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q);
                const cityMatch = this.selectedCity ? document.getElementById('citySelect').value === s.city : true;
                return queryMatch && cityMatch;
            });

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
                this.app.mapManager.flyTo(stop.lat, stop.lng, 16, { duration: 0.8 });
                const marker = this.app.mapManager.markers.find(m => m.stopData.id === stopId);
                if (marker) marker.openPopup();
            }

            searchInput.value = '';
            searchResults.classList.remove('active');
        });

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
    // Favorites UI
    // ============================================================
    renderFavorites() {
        const favs = this.app.favManager.getFavoriteStops();
        if (this.dom.favCount) this.dom.favCount.textContent = favs.length;

        if (favs.length === 0) {
            if (this.dom.emptyFavs) this.dom.emptyFavs.style.display = 'block';
            if (this.dom.favoritesList) {
                this.dom.favoritesList.querySelectorAll('.favorite-item').forEach(i => i.remove());
            }
            return;
        }

        if (this.dom.emptyFavs) this.dom.emptyFavs.style.display = 'none';

        if (this.dom.favoritesList) {
            this.dom.favoritesList.querySelectorAll('.favorite-item').forEach(i => i.remove());

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
                    this.app.setAlarmForStop(stop.id);
                });

                el.querySelector('.fav-action-btn.remove').addEventListener('click', e => {
                    e.stopPropagation();
                    this.app.toggleFavorite(stop.id);
                });

                el.addEventListener('click', () => {
                    this.app.mapManager.flyTo(stop.lat, stop.lng, 16, { duration: 0.8 });
                    const marker = this.app.mapManager.markers.find(m => m.stopData.id === stop.id);
                    if (marker) setTimeout(() => marker.openPopup(), 500);
                    this.collapseSheet();
                });

                this.dom.favoritesList.appendChild(el);
            });
        }
    }

    // ============================================================
    // Settings
    // ============================================================
    initSettings() {
        const modal = this.dom.settingsModal;
        if (!modal) return;

        document.getElementById('btnSettings')?.addEventListener('click', () => {
            modal.classList.add('active');
        });

        document.getElementById('settingsClose')?.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        modal.addEventListener('click', e => {
            if (e.target === modal) modal.classList.remove('active');
        });

        if (this.dom.distanceSlider) {
            this.dom.distanceSlider.addEventListener('input', e => {
                const val = parseInt(e.target.value);
                this.dom.distanceValue.textContent = val + 'm';
                this.app.alarmManager.saveSettings({ distance: val });
                if (this.app.alarmManager.activeAlarm) {
                    this.app.mapManager.showGeofenceCircle(this.app.alarmManager.activeAlarm.stop, val);
                }
            });
        }

        if (this.dom.headphoneToggle) {
            this.dom.headphoneToggle.addEventListener('change', e => {
                this.app.alarmManager.saveSettings({ headphoneOnly: e.target.checked });
                this.showToast(
                    e.target.checked ? '🎧 Sadece kulaklık modu açıldı' : '🔊 Hoparlörden de çalacak',
                    'info'
                );
            });
        }

        if (this.dom.vibrationToggle) {
            this.dom.vibrationToggle.addEventListener('change', e => {
                this.app.alarmManager.saveSettings({ vibration: e.target.checked });
            });
        }

        document.querySelectorAll('.sound-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.sound-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.app.alarmManager.saveSettings({ soundType: btn.dataset.sound });
                this.previewSound(btn.dataset.sound);
            });
        });
    }

    loadSettings() {
        const s = this.app.alarmManager.settings;
        if (this.dom.distanceSlider) this.dom.distanceSlider.value = s.distance;
        if (this.dom.distanceValue) this.dom.distanceValue.textContent = s.distance + 'm';
        if (this.dom.headphoneToggle) this.dom.headphoneToggle.checked = s.headphoneOnly;
        if (this.dom.vibrationToggle) this.dom.vibrationToggle.checked = s.vibration;

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

    bindEvents() {
        document.getElementById('btnLocate')?.addEventListener('click', () => {
            this.app.mapManager.locateUser();
        });

        document.getElementById('btnDemo')?.addEventListener('click', () => {
            const favs = this.app.favManager.getFavoriteStops();
            const pool = favs.length > 0 ? favs : STOPS;
            if (pool.length > 0) {
                const randomStop = pool[Math.floor(Math.random() * pool.length)];
                this.app.startDemoAlarm(randomStop.id);
            } else {
                this.showToast('⚠️ Demo için önce bir hedef seçin veya favori ekleyin', 'warning');
            }
        });

        document.getElementById('btnAllStops')?.addEventListener('click', () => {
            if (this.selectedCity && CITIES[this.selectedCity]) {
                const c = CITIES[this.selectedCity];
                this.app.mapManager.flyTo(c.lat, c.lng, 13, { duration: 1 });
            } else {
                this.app.mapManager.flyTo(39.0, 35.0, 6, { duration: 1 });
            }
            this.expandSheet();
        });

        document.getElementById('btnNearby')?.addEventListener('click', () => {
            this.showNearbyStops();
        });
    }

    showNearbyStops() {
        const center = this.app.mapManager.map.getCenter();
        const withDist = STOPS.map(s => ({
            ...s,
            dist: this.app.alarmManager.haversine(center.lat, center.lng, s.lat, s.lng)
        })).sort((a, b) => a.dist - b.dist);

        const nearby = withDist.slice(0, 8);

        if (this.dom.nearbyScroll) {
            this.dom.nearbyScroll.innerHTML = nearby.map(s => `
        <div class="nearby-card" data-stop-id="${s.id}">
            <div class="nearby-card-name">${s.name}</div>
            <div class="nearby-card-lines">📍 ${s.city}</div>
            <div class="nearby-card-distance">${s.dist > 1000 ? (s.dist / 1000).toFixed(1) + ' km' : Math.round(s.dist) + ' m'
                }</div>
        </div>
        `).join('');

            this.dom.nearbyScroll.querySelectorAll('.nearby-card').forEach(card => {
                card.addEventListener('click', () => {
                    const sid = parseInt(card.dataset.stopId);
                    const stop = getStopById(sid);
                    if (stop) {
                        this.app.mapManager.flyTo(stop.lat, stop.lng, 16, { duration: 0.8 });
                        const marker = this.app.mapManager.markers.find(m => m.stopData.id === sid);
                        if (marker) setTimeout(() => marker.openPopup(), 500);
                        this.collapseSheet();
                    }
                });
            });
        }

        if (this.dom.nearbySection) this.dom.nearbySection.style.display = 'block';
        this.expandSheet();
    }
}
