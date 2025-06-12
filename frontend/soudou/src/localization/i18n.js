import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useState, useEffect } from 'react';

// Only import English (base) and French
const en = require('./en.json'); // base language
const fr = require('./fr.json'); // only other supported language

const i18n = new I18n({
  en,
  fr,
});
i18n.enableFallback = true;
i18n.defaultLocale = 'en';
const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';
// Only allow 'en' or 'fr'
i18n.locale = ['en', 'fr'].includes(deviceLanguage) ? deviceLanguage : 'en';

// --- CONTEXT PART FOR GLOBAL LANGUAGE STATE ---
const LanguageContext = createContext({
  language: i18n.locale,
  setLanguage: () => {},
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(i18n.locale);

  useEffect(() => {
    loadSavedLanguage().then(() => setLanguageState(i18n.locale));
  }, []);

  const setLanguage = async (lang) => {
    if (!['en', 'fr'].includes(lang)) lang = 'en';
    await setAppLanguage(lang);
    setLanguageState(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

export const setAppLanguage = async (locale) => {
  if (['en', 'fr'].includes(locale)) {
    i18n.locale = locale;
    await AsyncStorage.setItem('user-language', locale);
  } else {
    console.warn(`Language '${locale}' not supported, falling back to default.`);
    i18n.locale = i18n.defaultLocale;
    await AsyncStorage.removeItem('user-language');
  }
};

export const loadSavedLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem('user-language');
    if (savedLanguage && ['en', 'fr'].includes(savedLanguage)) {
      i18n.locale = savedLanguage;
    } else {
      i18n.locale = ['en', 'fr'].includes(deviceLanguage) ? deviceLanguage : i18n.defaultLocale;
    }
  } catch (e) {
    console.error("Failed to load saved language:", e);
    i18n.locale = ['en', 'fr'].includes(deviceLanguage) ? deviceLanguage : i18n.defaultLocale;
  }
};

loadSavedLanguage();

export default i18n;