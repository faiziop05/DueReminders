import React, { useEffect, useState, useRef } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { StyleSheet, View, ActivityIndicator, Alert, TouchableOpacity, Text, Image, Animated } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import useStore from '../src/store/useStore';
import { requestPermissions, setupNotificationCategories } from '../src/utils/notifications';
import AlertModal from '../src/components/AlertModal';

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

const BIOMETRIC_KEY = '@due_reminders_biometrics_enabled';

import { Redirect } from 'expo-router';

const RootLayout = () => {
  const initialize = useStore((state) => state.initialize);
  const [ready, setReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const hasSeenOnboarding = useStore((state) => state.hasSeenOnboarding);
  const ACCENT = '#0A84FF';
  const SURFACE = '#1C1C1E';
  const BORDER = '#38383A';
  const TEXT_PRIMARY = '#FFFFFF';

  const performAuth = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      setIsLocked(false);
      setReady(true);
      return true;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Due Reminders',
      fallbackLabel: 'Enter Passcode',
    });

    if (result.success) {
      setIsLocked(false);
      // If we are retrying, we need to make sure the app finishes setup
      if (!ready) {
        const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
        if (!isExpoGo) {
          await requestPermissions();
          await setupNotificationCategories();
        }
        setReady(true);
      }
      return true;
    }
    return false;
  };

  useEffect(() => {
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

    const setup = async () => {
      // Wait for DB to open and data to load
      await initialize();

      // Biometric check
      const storedBiometrics = await AsyncStorage.getItem(BIOMETRIC_KEY);
      if (storedBiometrics === 'true') {
        setIsLocked(true);
        const success = await performAuth();
        if (!success) {
          return;
        }
      }

      if (!isExpoGo) {
        const granted = await requestPermissions();
        await setupNotificationCategories();
      }

      setReady(true);
    };

    setup();
  }, []);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!ready) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }
  }, [ready]);

  if (!ready) {
    return (
      <View style={[styles.loader, { backgroundColor: '#000' }]}>
        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Image
            source={require('../assets/icon5.png')}
            style={{ width: 120, height: 120, marginBottom: 24 }}
            resizeMode="contain"
          />
          <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 18, letterSpacing: 6, textTransform: 'uppercase' }}>
            DUE REMINDERS
          </Text>
          <View style={{ marginTop: 40 }}>
            {/* <ActivityIndicator size="small" color={ACCENT} /> */}
          </View>
        </Animated.View>

        {isLocked && (
          <TouchableOpacity
            onPress={performAuth}
            style={{
              position: 'absolute',
              bottom: 80,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 40,
              paddingVertical: 18,
              backgroundColor: ACCENT,
              borderRadius: 30,
              shadowColor: ACCENT,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 5
            }}
          >
            <Ionicons name="lock-open" size={20} color="#FFF" style={{ marginRight: 12 }} />
            <Text style={{ color: '#FFF', fontWeight: '900', letterSpacing: 2, fontSize: 14 }}>UNLOCK</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <BottomSheetModalProvider>
        {!hasSeenOnboarding && <Redirect href="/onboarding" />}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="history" options={{
            headerShown: true,
            headerStyle: {
              backgroundColor: '#000000',
              borderBottomWidth: 1,
              borderBottomColor: '#121212',
              height: 100,
            },
            headerTitleStyle: {
              color: TEXT_PRIMARY,
              fontWeight: '900',
              fontSize: 13,
              letterSpacing: 4,
              textTransform: 'uppercase',
            },
            headerTitleAlign: 'center',
            headerShadowVisible: false,
            tabBarStyle: {
              backgroundColor: '#000000',
              borderTopWidth: 1,
              borderTopColor: '#1C1C1E',
              height: 90,
              paddingBottom: 30,
              paddingTop: 10,
            },
            tabBarActiveTintColor: ACCENT,
            tabBarInactiveTintColor: '#48484A',
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1,
            },
          }
          } />
          <Stack.Screen name="create-reminder" options={{
            headerShown: true,
            headerStyle: {
              backgroundColor: '#000000',
              borderBottomWidth: 1,
              borderBottomColor: '#121212',
              height: 100,
            },
            headerTitleStyle: {
              color: TEXT_PRIMARY,
              fontWeight: '900',
              fontSize: 13,
              letterSpacing: 4,
              textTransform: 'uppercase',
            },
            headerTitleAlign: 'center',
            headerShadowVisible: false,
            tabBarStyle: {
              backgroundColor: '#000000',
              borderTopWidth: 1,
              borderTopColor: '#1C1C1E',
              height: 90,
              paddingBottom: 30,
              paddingTop: 10,
            },
            tabBarActiveTintColor: ACCENT,
            tabBarInactiveTintColor: '#48484A',
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1,
            },
          }
          } />
          <Stack.Screen
            name="view-reminder"
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: '#000000', borderBottomWidth: 0 },
              headerTitleStyle: { color: '#FFFFFF', fontWeight: '900', fontSize: 13, letterSpacing: 4, textTransform: 'uppercase' },
              headerTitleAlign: 'center',
              headerShadowVisible: false,
              headerTintColor: '#0A84FF',
            }}
          />
        </Stack>
        <AlertModal />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loader: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RootLayout;
