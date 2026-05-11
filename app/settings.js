import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Share, Linking, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import useStore from '../src/store/useStore';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const ACCENT = '#0A84FF';
const RED = '#FF453A';
const SURFACE = '#111111';
const BORDER = '#242424';
const TEXT_PRI = '#FFFFFF';
const TEXT_SEC = '#8E8E93';

const BIOMETRIC_KEY = '@due_reminders_biometrics_enabled';

const SettingsScreen = () => {
  const router = useRouter();
  const { 
    tasks, completedTasks, showAlert, clearHistory, importData,
    notificationsEnabled, toggleNotifications 
  } = useStore();
  
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    checkInitialStates();
  }, []);

  const checkInitialStates = async () => {
    // Load biometrics preference
    const storedBiometrics = await AsyncStorage.getItem(BIOMETRIC_KEY);
    if (storedBiometrics !== null) {
      setBiometricsEnabled(storedBiometrics === 'true');
    }
  };

  const authenticate = async (reason) => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return true;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason || 'Confirm identity to continue',
      fallbackLabel: 'Enter Passcode',
    });
    return result.success;
  };

  const handleToggleNotifications = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleNotifications();
  };

  const toggleBiometrics = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const success = await authenticate(biometricsEnabled ? 'Disable Biometric Lock' : 'Enable Biometric Lock');
    if (success) {
      const newState = !biometricsEnabled;
      setBiometricsEnabled(newState);
      await AsyncStorage.setItem(BIOMETRIC_KEY, newState ? 'true' : 'false');
    }
  };

  const handleExport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);

    try {
      const data = JSON.stringify({
        version: '1.0.4',
        export_date: new Date().toISOString(),
        tasks,
        completedTasks
      }, null, 2);

      const fileName = `DueLedger_Backup_${new Date().getTime()}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      // Fixed: Using standard writeAsStringAsync as legacy import might be tricky in some Expo versions
      // The warning is just a suggestion, but let's try to handle it if it fails.
      await FileSystem.writeAsStringAsync(fileUri, data);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        await Share.share({ message: data });
      }
    } catch (error) {
      console.error(error);
      showAlert({
        title: 'Export Failed',
        message: 'An error occurred while generating the backup.',
        buttons: [{ text: 'OK' }]
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      showAlert({
        title: 'Import Data',
        message: 'This will OVERWRITE all current reminders and history. Proceed?',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import & Overwrite',
            style: 'destructive',
            onPress: async () => {
              setIsProcessing(true);
              try {
                const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
                const data = JSON.parse(fileContent);

                if (!data.tasks || !data.completedTasks) {
                  throw new Error('Invalid file format');
                }

                await importData(data);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  showAlert({
                    title: 'Success',
                    message: 'Your ledger has been successfully restored.',
                    buttons: [{ text: 'AWESOME' }]
                  });
              } catch (error) {
                console.error(error);
                  showAlert({
                    title: 'Import Failed',
                    message: 'The selected file is not a valid Due Ledger backup.',
                    buttons: [{ text: 'RETRY' }]
                  });
              } finally {
                setIsProcessing(false);
              }
            }
          }
        ]
      });
    } catch (e) {
      console.log(e);
    }
  };

  const handleClearHistory = () => {
    showAlert({
      title: 'Clear History',
      message: 'This will permanently remove all completed records. Active tasks will be kept. Continue?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            await clearHistory();
            setIsProcessing(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    });
  };

  const handleRateApp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
    } else {
      // Fallback to store page
      const pkg = 'com.faiz.duereminders';
      if (Platform.OS === 'android') {
        Linking.openURL(`market://details?id=${pkg}`).catch(() => {
          Linking.openURL(`https://play.google.com/store/apps/details?id=${pkg}`);
        });
      } else {
        Linking.openURL(`itms-apps://itunes.apple.com/app/viewContentsUserReviews/id123456789?action=write-review`);
      }
    }
  };

  const SettingRow = ({ icon, label, value, type, onPress, color = TEXT_PRI }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={type === 'toggle' ? 1 : 0.7}
      disabled={type === 'toggle'}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>

      {type === 'toggle' ? (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: '#3A3A3C', true: ACCENT }}
          thumbColor="#FFFFFF"
        />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={BORDER} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        headerShown: true,
        title: 'SETTINGS',
        headerStyle: { backgroundColor: '#000', borderBottomWidth: 0 },
        headerTitleStyle: { color: TEXT_PRI, fontWeight: '900', fontSize: 13, letterSpacing: 4 },
        headerTintColor: ACCENT,
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
            <Ionicons name="chevron-back" size={28} color={ACCENT} />
          </TouchableOpacity>
        ),
      }} />

      {isProcessing && (
        <View style={styles.loaderOverlay}>
          <View style={styles.loaderContent}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.loaderText}>PROCESSING...</Text>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => router.push('/profile')}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JD</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>Due Reminders User</Text>
            <Text style={styles.userSub}>Premium Command Center</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={BORDER} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>PREFERENCES</Text>
        <View style={styles.section}>
          <SettingRow
            icon="notifications"
            label="Push Notifications"
            type="toggle"
            value={notificationsEnabled}
            onPress={handleToggleNotifications}
          />
          <SettingRow
            icon="finger-print"
            label="Biometric Lock"
            type="toggle"
            value={biometricsEnabled}
            onPress={toggleBiometrics}
          />
        </View>

        <Text style={styles.sectionTitle}>DATA & PRIVACY</Text>
        <View style={styles.section}>
          <SettingRow
            icon="cloud-upload"
            label="Export Ledger (JSON)"
            onPress={handleExport}
          />
          <SettingRow
            icon="cloud-download"
            label="Import & Restore"
            onPress={handleImport}
          />
          <SettingRow
            icon="trash"
            label="Clear History"
            color={RED}
            onPress={handleClearHistory}
          />
        </View>

        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.section}>
          <SettingRow
            icon="information-circle"
            label="App Version"
            onPress={() => showAlert({
              title: 'Due Reminders v1.0.4',
              message: 'Build 2024.04.24\nDesigned for Power Users.',
              buttons: [{ text: 'CLOSE' }]
            })}
          />
          <SettingRow
            icon="star"
            label="Rate Due Reminders"
            onPress={handleRateApp}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>DESIGNED BY DUE REMINDERS</Text>
          <Text style={styles.footerSub}>SECURE • MINIMAL • POWERFUL</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingBottom: 100 },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContent: { alignItems: 'center', gap: 16 },
  loaderText: { color: ACCENT, fontSize: 10, fontWeight: '900', letterSpacing: 4 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    padding: 20,
    borderRadius: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: BORDER,
  },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  profileInfo: { flex: 1, marginLeft: 16 },
  userName: { fontSize: 20, fontWeight: '800', color: TEXT_PRI },
  userSub: { fontSize: 13, color: TEXT_SEC, marginTop: 2, fontWeight: '600' },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: TEXT_SEC, letterSpacing: 2, marginBottom: 12, marginLeft: 4 },
  section: { backgroundColor: SURFACE, borderRadius: 24, marginBottom: 24, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  iconContainer: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  label: { flex: 1, fontSize: 16, fontWeight: '600' },
  footer: { marginTop: 40, alignItems: 'center' },
  footerText: { fontSize: 10, fontWeight: '900', color: TEXT_SEC, letterSpacing: 4 },
  footerSub: { fontSize: 8, fontWeight: '800', color: BORDER, marginTop: 8, letterSpacing: 1 },
});

export default SettingsScreen;
