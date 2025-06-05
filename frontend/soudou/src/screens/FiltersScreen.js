import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Button } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function FiltersScreen() {
  const navigation = useNavigation();
  const route = useRoute(); // Use useRoute hook to get route params

  // Initial values from Home screen (e.g., 'For Sale' or 'For Rent' if passed)
  const { selectedListingType } = route.params || {};

  // State for filter values
  const [minBedrooms, setMinBedrooms] = useState('any');
  const [maxBedrooms, setMaxBedrooms] = useState('any');
  const [minBathrooms, setMinBathrooms] = useState('any');
  const [maxBathrooms, setMaxBathrooms] = useState('any');
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState([]);
  const [selectedListingTypeLocal, setSelectedListingTypeLocal] = useState(selectedListingType || 'For Sale'); // Default to 'For Sale'

  const propertyTypes = ['House', 'Apartment', 'Land', 'Commercial', 'Detached', 'Semi-detached', 'Terraced', 'Bungalow', 'Flat', 'Park home']; // From Image 2
  const bedroomOptions = ['any', 1, 2, 3, 4, 5, 6, 7, 8]; // Add more if needed
  const bathroomOptions = ['any', 1, 2, 3, 4, 5, 6]; // Add more if needed

  useEffect(() => {
    // If listing type was passed from Home, set it to local state
    if (selectedListingType) {
      setSelectedListingTypeLocal(selectedListingType);
    }
  }, [selectedListingType]);

  const togglePropertyType = (type) => {
    if (selectedPropertyTypes.includes(type)) {
      setSelectedPropertyTypes(selectedPropertyTypes.filter(item => item !== type));
    } else {
      setSelectedPropertyTypes([...selectedPropertyTypes, type]);
    }
  };

  const applyFilters = () => {
    // Build a filter object to pass back to HomeScreen
    const filters = {
      listingType: selectedListingTypeLocal,
      minBedrooms: minBedrooms !== 'any' ? Number(minBedrooms) : undefined,
      maxBedrooms: maxBedrooms !== 'any' ? Number(maxBedrooms) : undefined,
      minBathrooms: minBathrooms !== 'any' ? Number(minBathrooms) : undefined,
      maxBathrooms: maxBathrooms !== 'any' ? Number(maxBathrooms) : undefined,
      propertyType: selectedPropertyTypes.length > 0 ? selectedPropertyTypes : undefined,
      // Add other filter values here as you implement them (e.g., hasGarden: true)
    };

    // Navigate back to Home screen (specifically, the Home component within the HomeTab stack)
    // and pass the collected filters as parameters.
    navigation.navigate('HomeTab', { screen: 'Home', params: { appliedFilters: filters } });
  };

  const clearFilters = () => {
    setMinBedrooms('any');
    setMaxBedrooms('any');
    setMinBathrooms('any');
    setMaxBathrooms('any');
    setSelectedPropertyTypes([]);
    // Optionally reset listingType here if you want 'Clear' to reset everything
    // setSelectedListingTypeLocal('For Sale');
  };

  return (
    <View style={styles.outerContainer}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Text style={styles.header}>Filters</Text>

        {/* For Sale / For Rent Toggle - now on Filters Screen for initial pre-selection */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Listing Type</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, selectedListingTypeLocal === 'For Sale' && styles.activeToggleButton]}
              onPress={() => setSelectedListingTypeLocal('For Sale')}
            >
              <Text style={[styles.toggleButtonText, selectedListingTypeLocal === 'For Sale' && styles.activeToggleButtonText]}>For Sale</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, selectedListingTypeLocal === 'For Rent' && styles.activeToggleButton]}
              onPress={() => setSelectedListingTypeLocal('For Rent')}
            >
              <Text style={[styles.toggleButtonText, selectedListingTypeLocal === 'For Rent' && styles.activeToggleButtonText]}>To Rent</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bedrooms Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Bedrooms</Text>
          <View style={styles.pickerRow}>
            <Text style={styles.pickerLabel}>Min:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={minBedrooms}
                onValueChange={(itemValue) => setMinBedrooms(itemValue)}
                style={styles.picker}
              >
                {bedroomOptions.map(option => (
                  <Picker.Item key={option} label={option === 'any' ? 'No min' : String(option)} value={option} />
                ))}
              </Picker>
            </View>
            <Text style={styles.pickerLabel}>Max:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={maxBedrooms}
                onValueChange={(itemValue) => setMaxBedrooms(itemValue)}
                style={styles.picker}
              >
                {bedroomOptions.map(option => (
                  <Picker.Item key={option} label={option === 'any' ? 'No max' : String(option)} value={option} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        {/* Bathrooms Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Bathrooms</Text>
          <View style={styles.pickerRow}>
            <Text style={styles.pickerLabel}>Min:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={minBathrooms}
                onValueChange={(itemValue) => setMinBathrooms(itemValue)}
                style={styles.picker}
              >
                {bathroomOptions.map(option => (
                  <Picker.Item key={option} label={option === 'any' ? 'No min' : String(option)} value={option} />
                ))}
              </Picker>
            </View>
            <Text style={styles.pickerLabel}>Max:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={maxBathrooms}
                onValueChange={(itemValue) => setMaxBathrooms(itemValue)}
                style={styles.picker}
              >
                {bathroomOptions.map(option => (
                  <Picker.Item key={option} label={option === 'any' ? 'No max' : String(option)} value={option} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        {/* Property Type Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Property Type</Text>
          <View style={styles.checkboxContainer}>
            {propertyTypes.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.checkboxButton, selectedPropertyTypes.includes(type) && styles.activeCheckboxButton]}
                onPress={() => togglePropertyType(type)}
              >
                <Text style={[styles.checkboxButtonText, selectedPropertyTypes.includes(type) && styles.activeCheckboxButtonText]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Apply and Clear Buttons */}
        <View style={styles.buttonRow}>
          <Button title="Clear" onPress={clearFilters} color="#888" />
          <Button title="Search" onPress={applyFilters} color="#00c3a5" />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50, // To avoid status bar
  },
  scrollViewContent: {
    padding: 20,
    paddingBottom: 40, // Give some space at the bottom
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#002f3d',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pickerLabel: {
    fontSize: 16,
    color: '#555',
    marginRight: 10,
  },
  pickerWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden', // Ensures picker stays within bounds
  },
  picker: {
    width: '100%',
    height: 40, // Standard height for pickers
  },
  checkboxContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  checkboxButton: {
    backgroundColor: '#eee',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    margin: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  checkboxButtonText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '500',
  },
  activeCheckboxButton: {
    backgroundColor: '#00c3a5', // Rightmove green
    borderColor: '#00c3a5',
  },
  activeCheckboxButtonText: {
    color: '#fff',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#eee',
    borderRadius: 8,
    padding: 5,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#002f3d',
  },
  activeToggleButton: {
    backgroundColor: '#00c3a5',
  },
  activeToggleButtonText: {
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
    marginBottom: 20,
  },
});