// ============================================================
// AlarmManager.js — Geofencing, Alarm & Kulaklık Algılama
// ============================================================

export class AlarmManager {
    constructor() {
        this.activeAlarm = null;
        this.watchId = null;
        this.updateInterval = null;
        this.audioCtx = null;
        this.oscillator = null;
        this.isRinging = false;
        this.settings = this.loadSettings();
        this.onDistanceUpdate = null; // callback
        this.onAlarmTriggered = null; // callback
        this.onStatusChange = null;  // callback
        this.lastUpdateTime = 0;
    }

    // Ayarları yükle
    loadSettings() {
        const data = localStorage.getItem('durak_alarm_settings');
        return data ? JSON.parse(data) : {
            distance: 400,           // metre
            headphoneOnly: false,
            vibration: true,
            soundType: 'melody'      // 'melody' | 'beep' | 'chime'
        };
    }

    saveSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        localStorage.setItem('durak_alarm_settings', JSON.stringify(this.settings));
    }

    // ============================================================
    // Haversine — iki GPS noktası arası mesafe (metre)
    // ============================================================
    haversine(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const toRad = x => x * Math.PI / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // ============================================================
    // Alarm kurma
    // ============================================================
    setAlarm(stop) {
        this.clearAlarm();
        this.activeAlarm = {
            stop: stop,
            startTime: Date.now(),
            lastDistance: null,
            status: 'tracking' // 'tracking' | 'approaching' | 'triggered'
        };

        this.startTracking();
        if (this.onStatusChange) this.onStatusChange('tracking', stop);
    }

    clearAlarm() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.stopSound();
        this.activeAlarm = null;
        if (this.onStatusChange) this.onStatusChange('idle', null);
    }

    // ============================================================
    // Akıllı Konum Takibi (FusedLocationProvider mantığı)
    // Uzakta → düşük hassasiyet (pil tasarrufu)
    // Yakında → yüksek hassasiyet
    // ============================================================
    getTrackingOptions(distance) {
        if (distance === null || distance > 2000) {
            return { enableHighAccuracy: false, maximumAge: 30000, timeout: 60000 };
        } else if (distance > 1000) {
            return { enableHighAccuracy: false, maximumAge: 15000, timeout: 30000 };
        } else if (distance > 500) {
            return { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 };
        } else {
            return { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 };
        }
    }

    startTracking() {
        if (!this.activeAlarm) return;

        const track = () => {
            const options = this.getTrackingOptions(
                this.activeAlarm ? this.activeAlarm.lastDistance : null
            );

            if (this.watchId) navigator.geolocation.clearWatch(this.watchId);

            this.watchId = navigator.geolocation.watchPosition(
                pos => this.handlePosition(pos),
                err => this.handleGeoError(err),
                options
            );
        };

        track();
        // Düzenli olarak hassasiyet seviyesini güncelle
        this.updateInterval = setInterval(track, 10000);
    }

    handlePosition(position) {
        if (!this.activeAlarm) return;

        const { latitude, longitude } = position.coords;
        const stop = this.activeAlarm.stop;
        const distance = this.haversine(latitude, longitude, stop.lat, stop.lng);

        this.activeAlarm.lastDistance = distance;

        // Pil optimizasyonu bilgisi
        const accuracy = distance > 1000 ? 'düşük' : distance > 500 ? 'orta' : 'yüksek';

        if (this.onDistanceUpdate) {
            this.onDistanceUpdate(distance, accuracy, stop);
        }

        // Geofence kontrolü
        if (distance <= this.settings.distance) {
            this.triggerAlarm();
        } else if (distance <= this.settings.distance * 1.5) {
            this.activeAlarm.status = 'approaching';
            if (this.onStatusChange) this.onStatusChange('approaching', stop);
        }
    }

    handleGeoError(err) {
        console.warn('Geolocation error:', err.message);
        // Demo modunda simülasyon devam eder
    }

    // ============================================================
    // Alarm Tetikleme
    // ============================================================
    async triggerAlarm() {
        if (this.isRinging) return;
        this.isRinging = true;
        this.activeAlarm.status = 'triggered';

        // Kulaklık kontrolü
        if (this.settings.headphoneOnly) {
            const hasHeadphones = await this.checkHeadphones();
            if (!hasHeadphones) {
                // Sadece titreşim
                this.vibrate();
                if (this.onAlarmTriggered) this.onAlarmTriggered(false, 'headphone_required');
                return;
            }
        }

        this.playAlarmSound();
        this.vibrate();
        if (this.onAlarmTriggered) this.onAlarmTriggered(true, 'full');
    }

    // ============================================================
    // Kulaklık Algılama
    // ============================================================
    async checkHeadphones() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
            // Eğer birden fazla audio output varsa, büyük ihtimalle kulaklık takılı
            return audioOutputs.length > 1;
        } catch (e) {
            return false;
        }
    }

    // ============================================================
    // Ses Çalma (Web Audio API)
    // ============================================================
    playAlarmSound() {
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

            switch (this.settings.soundType) {
                case 'melody': this.playMelody(); break;
                case 'beep': this.playBeep(); break;
                case 'chime': this.playChime(); break;
                default: this.playMelody();
            }
        } catch (e) {
            console.warn('Audio API error:', e);
        }
    }

    playMelody() {
        const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 659.25, 523.25];
        let t = this.audioCtx.currentTime;

        notes.forEach((freq, i) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(t);
            osc.stop(t + 0.4);
            t += 0.3;
        });

        // Tekrarla
        if (this.isRinging) {
            setTimeout(() => { if (this.isRinging) this.playMelody(); }, 3000);
        }
    }

    playBeep() {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = 880;
        gain.gain.value = 0.2;
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.15);

        if (this.isRinging) {
            setTimeout(() => { if (this.isRinging) this.playBeep(); }, 1000);
        }
    }

    playChime() {
        const freqs = [1174.66, 880, 1046.50, 783.99];
        let t = this.audioCtx.currentTime;
        freqs.forEach(freq => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(t);
            osc.stop(t + 0.8);
            t += 0.6;
        });

        if (this.isRinging) {
            setTimeout(() => { if (this.isRinging) this.playChime(); }, 4000);
        }
    }

    stopSound() {
        this.isRinging = false;
        if (this.audioCtx) {
            this.audioCtx.close().catch(() => { });
            this.audioCtx = null;
        }
    }

    vibrate() {
        if (this.settings.vibration && navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 400]);
        }
    }

    // ============================================================
    // Demo: Simüle mesafe azaltma (Geolocation olmadan test için)
    // ============================================================
    startDemo(stop) {
        this.setAlarm(stop);
        let simDistance = 2000;

        const demoInterval = setInterval(() => {
            if (!this.activeAlarm || simDistance <= 0) {
                clearInterval(demoInterval);
                return;
            }

            simDistance -= Math.random() * 150 + 50;
            if (simDistance < 0) simDistance = 0;

            const accuracy = simDistance > 1000 ? 'düşük' : simDistance > 500 ? 'orta' : 'yüksek';

            if (this.onDistanceUpdate) {
                this.onDistanceUpdate(simDistance, accuracy, stop);
            }

            if (simDistance <= this.settings.distance) {
                this.activeAlarm.status = 'triggered';
                this.triggerAlarm();
                clearInterval(demoInterval);
            } else if (simDistance <= this.settings.distance * 1.5) {
                this.activeAlarm.status = 'approaching';
                if (this.onStatusChange) this.onStatusChange('approaching', stop);
            }
        }, 2000);

        this.demoInterval = demoInterval;
    }

    clearDemo() {
        if (this.demoInterval) clearInterval(this.demoInterval);
        this.clearAlarm();
    }
}
