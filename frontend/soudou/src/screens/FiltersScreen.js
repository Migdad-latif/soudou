import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, TextInput } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

const REGIONS = [
  { label: 'Basse-Guinee', value: 'Basse-Guinee' },
  { label: 'Moyenne-Guinee', value: 'Moyenne-Guinee' },
  { label: 'Haute-Guinee', value: 'Haute-Guinee' },
  { label: 'Guinee-Forestiere', value: 'Guinee-Forestiere' },
];

const AMENITIES = [
  'Parking', 'Balcony', 'Furnished', 'Swimming Pool', 'Garden',
  'Gym', 'Security', 'Elevator', 'Air Conditioning', 'Internet'
];

export default function FiltersScreen({ route }) {
  const navigation = useNavigation();
  const initialParams = route.params || {};

  const [minPrice, setMinPrice] = useState(initialParams.priceMin || '');
  const [maxPrice, setMaxPrice] = useState(initialParams.priceMax || '');
  const [selectedRegion, setSelectedRegion] = useState(initialParams.region || '');
  const [city, setCity] = useState(initialParams.city || '');
  const [selectedAmenities, setSelectedAmenities] = useState(initialParams.amenities || []);
  const [sort, setSort] = useState(initialParams.sort || '');

  const toggleAmenity = (amenity) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const applyFilters = () => {
    const filters = {};
    if (minPrice) filters.priceMin = Number(minPrice);
    if (maxPrice) filters.priceMax = Number(maxPrice);
    if (selectedRegion) filters.region = selectedRegion;
    if (city) filters.city = city;
    if (selectedAmenities.length > 0) filters.amenities = selectedAmenities;
    if (sort) filters.sort = sort;
    navigation.navigate('Home', { filters });
  };

  // NEW: clear filters function
  const clearFilters = () => {
    navigation.navigate('Home', { filters: {} });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Price Range (GNF)</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={minPrice.toString()}
          onChangeText={v => setMinPrice(v.replace(/[^0-9]/g, ''))}
          placeholder="Min"
        />
        <Text style={{ marginHorizontal: 10 }}>-</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={maxPrice.toString()}
          onChangeText={v => setMaxPrice(v.replace(/[^0-9]/g, ''))}
          placeholder="Max"
        />
      </View>

      <Text style={styles.label}>Region</Text>
      <RNPickerSelect
        onValueChange={setSelectedRegion}
        items={REGIONS}
        value={selectedRegion}
        placeholder={{ label: 'Choose a region...', value: '' }}
        style={pickerSelectStyles}
      />

      <Text style={styles.label}>City (optional)</Text>
      <TextInput
        style={styles.input}
        value={city}
        onChangeText={setCity}
        placeholder="e.g. Conakry"
      />

      <Text style={styles.label}>Amenities</Text>
      <View style={styles.chipContainer}>
        {AMENITIES.map(a => (
          <Chip
            key={a}
            selected={selectedAmenities.includes(a)}
            onPress={() => toggleAmenity(a)}
            style={styles.chip}
          >
            {a}
          </Chip>
        ))}
      </View>

      <Text style={styles.label}>Sort By</Text>
      <RNPickerSelect
        onValueChange={setSort}
        items={[
          { label: 'Price (Low to High)', value: 'price' },
          { label: 'Price (High to Low)', value: '-price' },
          { label: 'Newest', value: '-createdAt' },
        ]}
        value={sort}
        placeholder={{ label: 'Sort by...', value: '' }}
        style={pickerSelectStyles}
      />

      <Button title="Apply Filters" onPress={applyFilters} />

      {/* NEW: Clear Filters Button */}
      <View style={{ marginTop: 10 }}>
        <Button title="Clear Filters" color="#dc3545" onPress={clearFilters} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  label: { fontWeight: 'bold', marginTop: 20, marginBottom: 5 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 6,
    padding: 10, width: 100, backgroundColor: '#fff'
  },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 10 },
  chip: { margin: 5 }
});

const pickerSelectStyles = {
  inputIOS: { paddingVertical: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, color: 'black', backgroundColor: '#fff', marginBottom: 10 },
  inputAndroid: { paddingVertical: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, color: 'black', backgroundColor: '#fff', marginBottom: 10 }
};