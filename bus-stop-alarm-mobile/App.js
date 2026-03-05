import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

import { STOPS, resetStops, getAllCityStops } from './src/store/Constants';
import { FavoriteManager, getStopByIdAsync } from './src/store/FavoriteManager';
import { AlarmManager } from './src/services/AlarmManager';
import { Nominatim } from './src/api/Nominatim';
import AppMap from './src/components/map/AppMap';
import LocationSearch from './src/components/search/LocationSearch';

// Notification configuration
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldVibrate: true,
    }),
});

const favManager = new FavoriteManager();
const alarmManager = new AlarmManager();

export default function App() {
    const [userLocation, setUserLocation] = useState(null);
    const [stops, setStops] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [activeAlarm, setActiveAlarm] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    useEffect(() => {
        async function setup() {
            await favManager.load();
            await alarmManager.init();
            setFavorites(favManager.getAll());

            alarmManager.onStatusChange = (status, stop) => {
                setActiveAlarm(status === 'idle' ? null : alarmManager.activeAlarm);
            };

            alarmManager.onDistanceUpdate = (distance, accuracy, stop) => {
                // Force re-render to update UI with distance
                setActiveAlarm({ ...alarmManager.activeAlarm, lastDistance: distance, accuracy });
            };

            // Request Permissions
            const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
            if (fgStatus === 'granted') {
                await Location.requestBackgroundPermissionsAsync();
            }

            const { status: notifStatus } = await Notifications.requestPermissionsAsync();

            // Get initial location
            if (fgStatus === 'granted') {
                let location = await Location.getCurrentPositionAsync({});
                setUserLocation({
                    lat: location.coords.latitude,
                    lng: location.coords.longitude
                });
            }

            // Initialize stops with all city stops
            const cityStops = getAllCityStops();
            resetStops(cityStops);
            setStops([...STOPS]);
        }
        setup();
    }, []);

    const handleMapPress = async (coordinate) => {
        try {
            const data = await Nominatim.reverseGeocode(coordinate.latitude, coordinate.longitude);
            let name = data?.name || data?.address?.road || "Seçilen Konum";
            let city = data?.address?.city || data?.address?.town || "Bilinmeyen Yer";

            const poi = {
                id: Date.now(),
                name,
                city,
                lat: coordinate.latitude,
                lng: coordinate.longitude,
                lines: []
            };

            resetStops([poi]);
            setStops([...STOPS]);
        } catch (err) {
            console.log(err);
        }
    };

    const setAlarm = async (stop) => {
        await alarmManager.setAlarm(stop);
    };

    const toggleFavorite = async (stop) => {
        if (favManager.isFavorite(stop.id)) {
            await favManager.remove(stop.id);
        } else {
            await favManager.add(stop);
        }
        setFavorites([...favManager.getAll()]);
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.mapContainer}>
                <AppMap
                    userLocation={userLocation}
                    stops={stops}
                    favorites={favorites}
                    activeAlarm={activeAlarm}
                    onMapPress={handleMapPress}
                    onMarkerPress={(stop) => console.log('Marker clicked', stop.name)}
                />
            </View>

            {/* Simple Top Search Bar */}
            <LocationSearch
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSelectLocation={(location) => {
                    // Update user location and stops when a suggestion is chosen
                    setUserLocation({ lat: location.lat, lng: location.lng });
                    resetStops([location]);
                    setStops([...STOPS]);
                }}
            />

            {/* Bottom Sheet Mockup */}
            <View style={styles.bottomSheet}>
                <View style={styles.handle} />

                {activeAlarm && activeAlarm.stop && (
                    <View style={styles.alarmCard}>
                        <Text style={styles.alarmTitle}>🔔 Alarm Kuruldu: {activeAlarm.stop.name}</Text>
                        <Text style={styles.alarmDistance}>
                            Mesafe: {activeAlarm.lastDistance ? Math.round(activeAlarm.lastDistance) + 'm' : 'Hesaplanıyor...'}
                        </Text>
                        <TouchableOpacity style={styles.btnDanger} onPress={() => alarmManager.clearAlarm()}>
                            <Text style={styles.btnText}>İptal Et</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <ScrollView style={styles.favList}>
                    <Text style={styles.sectionTitle}>Favoriler ({favorites.length})</Text>
                    {favorites.map(f => (
                        <View key={f.id} style={styles.favItem}>
                            <Text style={styles.favName}>{f.name}</Text>
                            <View style={styles.favActions}>
                                <TouchableOpacity style={styles.btnPrimary} onPress={() => setAlarm(f)}>
                                    <Text style={styles.btnText}>Alarm</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.btnDanger} onPress={() => toggleFavorite(f)}>
                                    <Text style={styles.btnText}>Sil</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                    {stops.length > 0 && !favorites.find(f => f.id === stops[0].id) && (
                        <View style={styles.favItem}>
                            <Text style={styles.favName}>Seçilen: {stops[0].name}</Text>
                            <View style={styles.favActions}>
                                <TouchableOpacity style={styles.btnPrimary} onPress={() => setAlarm(stops[0])}>
                                    <Text style={styles.btnText}>Alarm</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.btnFav} onPress={() => toggleFavorite(stops[0])}>
                                    <Text style={styles.btnText}>⭐ Ekle</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A192F',
    },
    mapContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    topNav: {
        position: 'absolute',
        top: 40,
        width: '100%',
        paddingHorizontal: 20,
    },
    searchBox: {
        flexDirection: 'row',
        backgroundColor: '#112240',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    searchIcon: {
        fontSize: 20,
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: '#CCD6F6',
        fontSize: 16,
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        backgroundColor: '#112240',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 40,
        maxHeight: '50%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#233554',
        borderRadius: 4,
        alignSelf: 'center',
        marginBottom: 20,
    },
    alarmCard: {
        backgroundColor: 'rgba(243, 156, 18, 0.15)',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F39C12',
        marginBottom: 15,
    },
    alarmTitle: {
        color: '#F39C12',
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 5,
    },
    alarmDistance: {
        color: '#CCD6F6',
        marginBottom: 10,
    },
    sectionTitle: {
        color: '#8892B0',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    favList: {
        flex: 1,
    },
    favItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0A192F',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
    },
    favName: {
        color: '#CCD6F6',
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
    },
    favActions: {
        flexDirection: 'row',
        gap: 10,
    },
    btnPrimary: {
        backgroundColor: '#4DA8DA',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    btnDanger: {
        backgroundColor: '#E74C3C',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    btnFav: {
        backgroundColor: '#F1C40F',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    btnText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 12,
    }
});
