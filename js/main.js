import 'leaflet/dist/leaflet.css';
import { FavoriteManager, getStopById } from './store/FavoriteManager.js';
import { AlarmManager } from './services/AlarmManager.js';
import { MapManager } from './map/MapManager.js';
import { UIManager } from './ui/UIManager.js';

class DurakAlarmApp {
    constructor() {
        this.favManager = new FavoriteManager();
        this.alarmManager = new AlarmManager();
        this.mapManager = new MapManager(this);
        this.uiManager = new UIManager(this);
    }

    init() {
        this.mapManager.initMap();
        this.uiManager.init();
        this.uiManager.loadSettings();
        this.uiManager.renderFavorites();
        this.initAlarmCallbacks();

        // Expose global methods for inline HTML onclicks 
        // (Temporary workaround until full component refactoring)
        window._app = {
            setAlarmForStop: (id) => this.setAlarmForStop(id),
            toggleFavorite: (id) => this.toggleFavorite(id)
        };

        this.mapManager.locateUser();
    }

    setAlarmForStop(stopId) {
        const stop = getStopById(stopId);
        if (!stop) return;

        this.mapManager.map.closePopup();

        this.uiManager.dom.alarmCard.classList.add('active');
        this.uiManager.dom.alarmStopName.textContent = stop.name;
        this.uiManager.dom.alarmStopLines.textContent = '📍 ' + stop.city;
        this.uiManager.dom.alarmDistanceValue.textContent = 'Hesaplanıyor...';
        this.uiManager.dom.alarmDistanceFill.style.width = '0%';
        this.uiManager.dom.alarmDot.className = 'alarm-dot';
        this.uiManager.dom.alarmStatusText.textContent = 'Takip Ediliyor';

        this.mapManager.highlightMarker(stopId);
        this.mapManager.showGeofenceCircle(stop, this.alarmManager.settings.distance);
        this.mapManager.flyTo(stop.lat, stop.lng, 14, { duration: 1 });

        this.uiManager.showToast(`🔔 "${stop.name}" için alarm kuruldu`, 'success');
        this.alarmManager.setAlarm(stop);
    }

    startDemoAlarm(stopId) {
        const stop = getStopById(stopId);
        if (!stop) return;

        this.mapManager.map.closePopup();

        this.uiManager.dom.alarmCard.classList.add('active');
        this.uiManager.dom.alarmStopName.textContent = "[DEMO] " + stop.name;
        this.uiManager.dom.alarmStopLines.textContent = '📍 ' + stop.city;
        this.uiManager.dom.alarmDistanceValue.textContent = 'Demo Başlıyor...';
        this.uiManager.dom.alarmDistanceFill.style.width = '0%';
        this.uiManager.dom.alarmDot.className = 'alarm-dot';
        this.uiManager.dom.alarmStatusText.textContent = 'Simülasyon Aktif';

        this.mapManager.highlightMarker(stopId);
        this.mapManager.showGeofenceCircle(stop, this.alarmManager.settings.distance);
        this.mapManager.flyTo(stop.lat, stop.lng, 14, { duration: 1 });

        this.uiManager.showToast(`🚀 Demo Modu: "${stop.name}"`, 'info');
        this.alarmManager.startDemo(stop);
    }

    toggleFavorite(stopId) {
        if (this.favManager.isFavorite(stopId)) {
            this.favManager.remove(stopId);
            this.uiManager.showToast('⭐ Favorilerden çıkarıldı', 'info');
        } else {
            const stop = getStopById(stopId);
            if (stop) {
                this.favManager.add(stop);
                this.uiManager.showToast(`⭐ ${stop.name} favorilere eklendi`, 'success');
            }
        }
        this.uiManager.renderFavorites();
        this.mapManager.updateMarkerPopup(stopId);
    }

    initAlarmCallbacks() {
        this.alarmManager.onDistanceUpdate = (distance, accuracy, stop) => {
            const distStr = distance > 1000
                ? (distance / 1000).toFixed(1) + ' km'
                : Math.round(distance) + ' m';

            this.uiManager.dom.alarmDistanceValue.textContent = distStr;

            const pct = Math.max(0, Math.min(100, ((2000 - distance) / 2000) * 100));
            this.uiManager.dom.alarmDistanceFill.style.width = pct + '%';

            const accDot = this.uiManager.dom.alarmAccuracy.querySelector('.accuracy-dot');
            accDot.className = 'accuracy-dot';
            if (accuracy === 'düşük') {
                accDot.classList.add('low');
                this.uiManager.dom.alarmAccuracyText.textContent = 'Düşük Hassasiyet';
            } else if (accuracy === 'orta') {
                accDot.classList.add('mid');
                this.uiManager.dom.alarmAccuracyText.textContent = 'Orta Hassasiyet';
            } else {
                accDot.classList.add('high');
                this.uiManager.dom.alarmAccuracyText.textContent = 'Yüksek Hassasiyet';
            }

            if (distance <= this.alarmManager.settings.distance * 1.5 && distance > this.alarmManager.settings.distance) {
                this.uiManager.dom.alarmDot.className = 'alarm-dot approaching';
                this.uiManager.dom.alarmStatusText.textContent = 'Yaklaşıyorsunuz!';
                this.uiManager.dom.alarmDistanceFill.style.background = 'linear-gradient(90deg, #F39C12, #F1C40F)';
            }
        };

        this.alarmManager.onStatusChange = (status, stop) => {
            if (status === 'approaching') {
                this.uiManager.dom.alarmDot.className = 'alarm-dot approaching';
                this.uiManager.dom.alarmStatusText.textContent = 'Yaklaşıyorsunuz!';
                this.uiManager.showToast('⚠️ Durağınıza yaklaşıyorsunuz!', 'warning');
            } else if (status === 'idle') {
                this.uiManager.dom.alarmCard.classList.remove('active');
                this.mapManager.clearMarkerHighlights();
                this.mapManager.removeGeofenceCircle();
            }
        };

        this.alarmManager.onAlarmTriggered = (soundPlayed, reason) => {
            const stop = this.alarmManager.activeAlarm?.stop;
            this.uiManager.dom.alarmDot.className = 'alarm-dot triggered';
            this.uiManager.dom.alarmStatusText.textContent = 'ALARM!';

            if (stop) {
                this.uiManager.dom.alarmTriggeredStop.textContent = stop.name;
            }
            this.uiManager.dom.alarmOverlay.classList.add('active');

            if (reason === 'headphone_required') {
                this.uiManager.showToast('🎧 Kulaklık takılı değil — sadece titreşim gönderildi', 'warning');
            }
        };

        document.getElementById('alarmDismiss')?.addEventListener('click', () => {
            this.uiManager.dom.alarmOverlay.classList.remove('active');
            this.alarmManager.clearDemo();
            this.uiManager.dom.alarmCard.classList.remove('active');
            this.mapManager.clearMarkerHighlights();
            this.mapManager.removeGeofenceCircle();
            this.uiManager.showToast('✅ İyi yolculuklar!', 'success');
        });

        this.uiManager.dom.alarmClose?.addEventListener('click', () => {
            this.alarmManager.clearDemo();
            this.uiManager.dom.alarmCard.classList.remove('active');
            this.mapManager.clearMarkerHighlights();
            this.mapManager.removeGeofenceCircle();
            this.uiManager.showToast('🔕 Alarm iptal edildi', 'info');
        });
    }

    showMapLoading() { this.uiManager.showMapLoading(); }
    hideMapLoading() { this.uiManager.hideMapLoading(); }
    showToast(msg, type) { this.uiManager.showToast(msg, type); }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new DurakAlarmApp();
    app.init();
});
