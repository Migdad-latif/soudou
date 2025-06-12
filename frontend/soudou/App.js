import React, { useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/localization/i18n'; // <-- import LanguageProvider

export default function App() {
  const navigationRef = useRef(null);

  return (
    <LanguageProvider>
      <AuthProvider navigationRef={navigationRef}>
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </LanguageProvider>
  );
}