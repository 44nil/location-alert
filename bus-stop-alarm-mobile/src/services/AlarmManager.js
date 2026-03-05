import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { Vibration, Platform } from 'react-native';

const LOCATION_TRACKING_TASK = 'LOCATION_TRACKING_TASK';

// Global singleton to handle background updates
let globalAlarmManager = null;

export class AlarmManager {
    constructor() {
        this.activeAlarm = null;
        this.locationSubscription = null;
        this.sound = null;
        this.isRinging = false;
        this.settings = {
            distance: 400,
            headphoneOnly: false,
            vibration: true,
            soundType: 'melody'
        };
        this.onDistanceUpdate = null;
        this.onAlarmTriggered = null;
        this.onStatusChange = null;
        globalAlarmManager = this;
    }

    async init() {
        await this.loadSettings();
    }

    async loadSettings() {
        try {
            const data = await AsyncStorage.getItem('durak_alarm_settings_rn');
            if (data) {
                this.settings = { ...this.settings, ...JSON.parse(data) };
            }
        } catch (e) {
            console.error(e);
        }
        return this.settings;
    }

    async saveSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        try {
            await AsyncStorage.setItem('durak_alarm_settings_rn', JSON.stringify(this.settings));
        } catch (e) {
            console.error(e);
        }
    }

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

    async setAlarm(stop) {
        await this.clearAlarm();
        this.activeAlarm = {
            stop: stop,
            startTime: Date.now(),
            lastDistance: null,
            status: 'tracking'
        };

        // Save active alarm state to AsyncStorage for background persistence if needed
        await AsyncStorage.setItem('active_alarm_state', JSON.stringify(this.activeAlarm));

        await this.startTracking();
        if (this.onStatusChange) this.onStatusChange('tracking', stop);
    }

    async clearAlarm() {
        if (this.locationSubscription) {
            this.locationSubscription.remove();
            this.locationSubscription = null;
        }

        const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
        if (isTracking) {
            await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
        }

        await AsyncStorage.removeItem('active_alarm_state');
        await this.stopSound();
        this.activeAlarm = null;
        if (this.onStatusChange) this.onStatusChange('idle', null);
    }

    async startTracking() {
        if (!this.activeAlarm) return;

        let { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus !== 'granted') {
            console.warn('Foreground location permission denied');
            return;
        }

        // Foreground watcher for UI updates
        this.locationSubscription = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 5000,
                distanceInterval: 10,
            },
            (location) => {
                this.handlePosition(location);
            }
        );

        // Background tracking
        let { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus === 'granted') {
            await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 10000,
                distanceInterval: 50,
                foregroundService: {
                    notificationTitle: "Durak Alarmı Aktif",
                    notificationBody: `${this.activeAlarm.stop.name} için konum takibi yapılıyor.`,
                    notificationColor: "#4DA8DA"
                }
            });
        } else {
            console.warn('Background location permission denied. Tracking will stop if app is closed.');
        }
    }

    handlePosition(position) {
        if (!this.activeAlarm) return;

        const { latitude, longitude } = position.coords;
        const stop = this.activeAlarm.stop;
        const distance = this.haversine(latitude, longitude, stop.lat, stop.lng);

        this.activeAlarm.lastDistance = distance;
        const accuracy = distance > 1000 ? 'düşük' : distance > 500 ? 'orta' : 'yüksek';

        if (this.onDistanceUpdate) {
            this.onDistanceUpdate(distance, accuracy, stop);
        }

        if (distance <= this.settings.distance) {
            this.triggerAlarm();
        } else if (distance <= this.settings.distance * 1.5) {
            if (this.activeAlarm.status !== 'approaching') {
                this.activeAlarm.status = 'approaching';
                this.sendNotification(
                    "Durağa Yaklaşıyorsunuz!",
                    `${stop.name} durağına yaklaşık ${Math.round(distance)}m kaldı.`
                );
                if (this.onStatusChange) this.onStatusChange('approaching', stop);
            }
        }
    }

    async sendNotification(title, body) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: title,
                body: body,
                sound: 'default',
            },
            trigger: null, // trigger immediately
        });
    }

    async triggerAlarm() {
        if (this.isRinging) return;
        this.isRinging = true;
        this.activeAlarm.status = 'triggered';

        this.sendNotification(
            "HEDEFİNİZE VARDINIZ! 🔔",
            `${this.activeAlarm.stop.name} durağına geldiniz. İnebilirsiniz!`
        );

        await this.playAlarmSound();
        this.vibrate();
        if (this.onAlarmTriggered) this.onAlarmTriggered(true, 'full');
    }

    async playAlarmSound() {
        try {
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
            });

            // Fallback to vibration if no sound is loaded
            console.log("Playing alarm sound: ", this.settings.soundType);
            this.vibrate();

            // Loop vibration if ringing
            const ringInt = setInterval(() => {
                if (!this.isRinging) {
                    clearInterval(ringInt);
                    return;
                }
                this.vibrate();
            }, 2000);

        } catch (e) {
            console.warn('Audio API error:', e);
        }
    }

    async stopSound() {
        this.isRinging = false;
        if (this.sound) {
            await this.sound.stopAsync();
            await this.sound.unloadAsync();
            this.sound = null;
        }
    }

    vibrate() {
        if (this.settings.vibration) {
            Vibration.vibrate([200, 100, 200, 100, 400]);
        }
    }

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
                if (this.activeAlarm.status !== 'approaching') {
                    this.activeAlarm.status = 'approaching';
                    this.sendNotification("Demo: Yaklaşıyorsunuz", `${stop.name} yakınında.`);
                    if (this.onStatusChange) this.onStatusChange('approaching', stop);
                }
            }
        }, 2000);

        this.demoInterval = demoInterval;
    }

    clearDemo() {
        if (this.demoInterval) clearInterval(this.demoInterval);
        this.clearAlarm();
    }
}

// Register background task
TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }) => {
    if (error) {
        console.error("Background location task error:", error);
        return;
    }
    if (data) {
        const { locations } = data;
        const location = locations[0];

        // If the app is killed, we need to recreate the logic or rely on stored state
        // For simplicity, we assume the singleton exists if the app is alive in background
        if (globalAlarmManager) {
            globalAlarmManager.handlePosition(location);
        } else {
            // App might be killed. We should load state from AsyncStorage and check manually
            try {
                const stateData = await AsyncStorage.getItem('active_alarm_state');
                const settingsData = await AsyncStorage.getItem('durak_alarm_settings_rn');

                if (stateData) {
                    const state = JSON.parse(stateData);
                    const settings = settingsData ? JSON.parse(settingsData) : { distance: 400 };

                    const R = 6371000;
                    const toRad = x => x * Math.PI / 180;
                    const lat1 = location.coords.latitude;
                    const lon1 = location.coords.longitude;
                    const lat2 = state.stop.lat;
                    const lon2 = state.stop.lng;

                    const dLat = toRad(lat2 - lat1);
                    const dLon = toRad(lon2 - lon1);
                    const a = Math.sin(dLat / 2) ** 2 +
                        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                        Math.sin(dLon / 2) ** 2;
                    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                    if (distance <= settings.distance) {
                        // Trigger notification if not already done (or just trigger)
                        await Notifications.scheduleNotificationAsync({
                            content: {
                                title: "HEDEFİNİZE VARDINIZ! 🔔",
                                body: `${state.stop.name} durağına geldiniz. İnebilirsiniz!`,
                                sound: 'default',
                            },
                            trigger: null,
                        });
                        // Stop updates since we reached the target
                        await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
                        await AsyncStorage.removeItem('active_alarm_state');
                    }
                }
            } catch (err) {
                console.error("Background handling error:", err);
            }
        }
    }
});
