import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Button, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import i18n from '../localization/i18n'; // <-- Import translation

export default function FiltersScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const { selectedListingType, minBedrooms: initialMinBedrooms, maxBedrooms: initialMaxBedrooms,
    minBathrooms: initialMinBathrooms, maxBathrooms: initialMaxBathrooms,
    propertyType: initialPropertyType, keyword: initialKeyword } = route.params || {};

  const [minBedrooms, setMinBedrooms] = useState(initialMinBedrooms || 'any');
  const [maxBedrooms, setMaxBedrooms] = useState(initialMaxBedrooms || 'any');
  const [minBathrooms, setMinBathrooms] = useState(initialMinBathrooms || 'any');
  const [maxBathrooms, setMaxBathrooms] = useState(initialMaxBathrooms || 'any');
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState(initialPropertyType || []);
  const [selectedListingTypeLocal, setSelectedListingTypeLocal] = useState(selectedListingType || 'For Sale');
  const [keyword, setKeyword] = useState(initialKeyword || '');

  const propertyTypes = [
    i18n.t('house') || 'House',
    i18n.t('apartment') || 'Apartment',
    i18n.t('land') || 'Land',
    i18n.t('commercial') || 'Commercial',
    i18n.t('office') || 'Office'
  ];

  const bedroomOptions = ['any', 1, 2, 3, 4, 5, 6, 7, 8];
  const bathroomOptions = ['any', 1, 2, 3, 4, 5, 6];

  const togglePropertyType = (type) => {
    if (selectedPropertyTypes.includes(type)) {
      setSelectedPropertyTypes(selectedPropertyTypes.filter(item => item !== type));
    } else {
      setSelectedPropertyTypes([...selectedPropertyTypes, type]);
    }
  };

  const applyFilters = () => {
    const filtersToApply = {
      listingType: selectedListingTypeLocal,
      minBedrooms: minBedrooms !== 'any' ? Number(minBedrooms) : undefined,
      maxBedrooms: maxBedrooms !== 'any' ? Number(maxBedrooms) : undefined,
      minBathrooms: minBathrooms !== 'any' ? Number(minBathrooms) : undefined,
      maxBathrooms: maxBathrooms !== 'any' ? Number(maxBathrooms) : undefined,
      propertyType: selectedPropertyTypes.length > 0 ? selectedPropertyTypes : undefined,
      keyword: keyword !== '' ? keyword : undefined,
    };

    navigation.navigate('HomeTab', { screen: 'Home', params: { appliedFilters: filtersToApply } });
  };

  const clearFilters = () => {
    setMinBedrooms('any');
    setMaxBedrooms('any');
    setMinBathrooms('any');
    setMaxBathrooms('any');
    setSelectedPropertyTypes([]);
    setKeyword('');
    setSelectedListingTypeLocal('For Sale');
  };

  return (
    <View style={styles.outerContainer}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Text style={styles.header}>{i18n.t('filters') || 'Filters'}</Text>

        {/* Listing Type Toggle on Filters Screen */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{i18n.t('listingType') || 'Listing Type'}</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, selectedListingTypeLocal === 'For Sale' && styles.activeToggleButton]}
              onPress={() => setSelectedListingTypeLocal('For Sale')}
            >
              <Text style={[styles.toggleButtonText, selectedListingTypeLocal === 'For Sale' && styles.activeToggleButtonText]}>
                {i18n.t('forSale') || 'For Sale'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, selectedListingTypeLocal === 'For Rent' && styles.activeToggleButton]}
              onPress={() => setSelectedListingTypeLocal('For Rent')}
            >
              <Text style={[styles.toggleButtonText, selectedListingTypeLocal === 'For Rent' && styles.activeToggleButtonText]}>
                {i18n.t('toRent') || 'To Rent'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bedrooms Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{i18n.t('bedrooms') || 'Bedrooms'}</Text>
          <View style={styles.pickerRow}>
            <Text style={styles.pickerLabel}>{i18n.t('min') || 'Min'}:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={minBedrooms}
                onValueChange={(itemValue) => setMinBedrooms(itemValue)}
                style={styles.picker}
              >
                {bedroomOptions.map(option => (
                  <Picker.Item key={String(option)} label={option === 'any' ? (i18n.t('noMin') || 'No min') : String(option)} value={option} />
                ))}
              </Picker>
              <Text style={styles.pickerSelectionText}>
                {minBedrooms === 'any' ? '' : minBedrooms}
              </Text>
            </View>
            <Text style={styles.pickerLabel}>{i18n.t('max') || 'Max'}:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={maxBedrooms}
                onValueChange={(itemValue) => setMaxBedrooms(itemValue)}
                style={styles.picker}
              >
                {bedroomOptions.map(option => (
                  <Picker.Item key={String(option)} label={option === 'any' ? (i18n.t('noMax') || 'No max') : String(option)} value={option} />
                ))}
              </Picker>
              <Text style={styles.pickerSelectionText}>
                {maxBedrooms === 'any' ? '' : maxBedrooms}
              </Text>
            </View>
          </View>
        </View>

        {/* Bathrooms Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{i18n.t('bathrooms') || 'Bathrooms'}</Text>
          <View style={styles.pickerRow}>
            <Text style={styles.pickerLabel}>{i18n.t('min') || 'Min'}:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={minBathrooms}
                onValueChange={(itemValue) => setMinBathrooms(itemValue)}
                style={styles.picker}
              >
                {bathroomOptions.map(option => (
                  <Picker.Item key={String(option)} label={option === 'any' ? (i18n.t('noMin') || 'No min') : String(option)} value={option} />
                ))}
              </Picker>
              <Text style={styles.pickerSelectionText}>
                {minBathrooms === 'any' ? '' : minBathrooms}
              </Text>
            </View>
            <Text style={styles.pickerLabel}>{i18n.t('max') || 'Max'}:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={maxBathrooms}
                onValueChange={(itemValue) => setMaxBathrooms(itemValue)}
                style={styles.picker}
              >
                {bathroomOptions.map(option => (
                  <Picker.Item key={String(option)} label={option === 'any' ? (i18n.t('noMax') || 'No max') : String(option)} value={option} />
                ))}
              </Picker>
              <Text style={styles.pickerSelectionText}>
                {maxBathrooms === 'any' ? '' : maxBathrooms}
              </Text>
            </View>
          </View>
        </View>

        {/* Property Type Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{i18n.t('propertyType') || 'Property Type'}</Text>
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

        {/* Keyword Search Input */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{i18n.t('keywords') || 'Keywords'}</Text>
          <TextInput
            style={styles.keywordInput}
            placeholder={i18n.t('keywordsPlaceholder') || "e.g. garden, balcony, specific area"}
            placeholderTextColor="#888"
            value={keyword}
            onChangeText={setKeyword}
          />
        </View>

        {/* Apply and Clear Buttons */}
        <View style={styles.buttonRow}>
          <Button title={i18n.t('clear') || "Clear"} onPress={clearFilters} color="#888" />
          <Button title={i18n.t('search') || "Search"} onPress={applyFilters} color="#00c3a5" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
  },
  scrollViewContent: {
    padding: 20,
    paddingBottom: 40,
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
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  picker: {
    width: '70%',
    height: 40,
    color: 'transparent',
    backgroundColor: '#f9f9f9',
    textAlign: 'center',
    fontSize: 16,
  },
  pickerSelectionText: {
    position: 'absolute',
    left: 15,
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
    width: '70%',
    textAlign: 'left',
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
    backgroundColor: '#00c3a5',
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
  keywordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#333',
  },
});