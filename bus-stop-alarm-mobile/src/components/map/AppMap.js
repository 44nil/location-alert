import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';

export default function AppMap({
    userLocation,
    stops,
    activeAlarm,
    favorites,
    onMapPress,
    onMarkerPress
}) {
    const mapRef = useRef(null);

    // Dark map style
    const customMapStyle = [
        {
            "elementType": "geometry",
            "stylers": [{ "color": "#000F28" }] // Base background (navy)
        },
        {
            "elementType": "labels.text.stroke",
            "stylers": [{ "color": "#172A46" }] // Darker borders
        },
        {
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#ccd6f6" }] // Light grey/blue text
        },
        {
            "featureType": "road",
            "elementType": "geometry",
            "stylers": [{ "color": "#112240" }] // Roads are slightly lighter navy
        },
        {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{ "color": "#0d1b2a" }] // Darker water
        }
    ];

    useEffect(() => {
        if (userLocation && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: userLocation.lat,
                longitude: userLocation.lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }, 1000);
        }
    }, [userLocation]);

    // Combine stops and active alarm to render markers
    const allStopsToRender = [...stops];
    if (activeAlarm && activeAlarm.stop && !allStopsToRender.find(s => s.id === activeAlarm.stop.id)) {
        allStopsToRender.push(activeAlarm.stop);
    }

    favorites.forEach(fav => {
        if (!allStopsToRender.find(s => s.id === fav.id)) {
            allStopsToRender.push(fav);
        }
    });

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                customMapStyle={customMapStyle}
                initialRegion={{
                    latitude: 39.0,
                    longitude: 35.0,
                    latitudeDelta: 10,
                    longitudeDelta: 10,
                }}
                showsUserLocation={true}
                showsMyLocationButton={false}
                onPress={(e) => onMapPress(e.nativeEvent.coordinate)}
            >
                {allStopsToRender.map((stop) => {
                    const isAlarmActive = activeAlarm?.stop?.id === stop.id;
                    const isFav = favorites.find(f => f.id === stop.id);
                    // Determine pin color based on state
                    const pinColor = isAlarmActive ? '#F39C12' : '#E74C3C'; // Orange vs Danger red

                    return (
                        <Marker
                            key={`stop-${stop.id}`}
                            coordinate={{ latitude: stop.lat, longitude: stop.lng }}
                            title={stop.name}
                            description={stop.city}
                            pinColor={pinColor}
                            onPress={() => onMarkerPress(stop)}
                        />
                    );
                })}

                {/* Geofence Circle if alarm is active */}
                {activeAlarm && activeAlarm.stop && (
                    <Circle
                        center={{ latitude: activeAlarm.stop.lat, longitude: activeAlarm.stop.lng }}
                        radius={400} // Default 400m
                        strokeColor="#4DA8DA"
                        fillColor="rgba(77, 168, 218, 0.2)"
                        strokeWidth={2}
                    />
                )}
            </MapView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        width: '100%',
        height: '100%',
    },
});
