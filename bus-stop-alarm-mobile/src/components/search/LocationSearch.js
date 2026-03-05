// src/components/search/LocationSearch.js
import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Nominatim } from '../../api/Nominatim';

// Simple debounce helper
function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

export default function LocationSearch({ searchQuery, setSearchQuery, onSelectLocation }) {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch suggestions when query changes (debounced)
    const fetchSuggestions = debounce(async (query) => {
        if (!query) {
            setSuggestions([]);
            return;
        }
        setLoading(true);
        try {
            const results = await Nominatim.searchLocation(query);
            // Map Nominatim result to simple location objects
            const mapped = results.map((item) => ({
                id: item.place_id || Math.random().toString(),
                name: item.display_name || item.name || query,
                city: item.address?.city || item.address?.town || item.address?.village || '',
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
            }));
            setSuggestions(mapped);
        } catch (e) {
            console.warn('Search suggestions error:', e);
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }, 300);

    useEffect(() => {
        fetchSuggestions(searchQuery);
    }, [searchQuery]);

    const handleSelect = (location) => {
        setSearchQuery('');
        setSuggestions([]);
        onSelectLocation(location);
    };

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder="Hedef ara..."
                placeholderTextColor="#8892B0"
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
            {suggestions.length > 0 && (
                <FlatList
                    data={suggestions}
                    keyExtractor={(item) => item.id.toString()}
                    style={styles.list}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)}>
                            <Text style={styles.itemText}>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#112240',
        borderRadius: 12,
        padding: 12,
        color: '#CCD6F6',
        fontSize: 16,
    },
    list: {
        backgroundColor: '#112240',
        borderRadius: 8,
        marginTop: 4,
        maxHeight: 150,
    },
    item: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#233554',
    },
    itemText: {
        color: '#CCD6F6',
    },
});
