import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import useStore from '../src/store/useStore';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const ACCENT = '#0A84FF';
const SURFACE = '#111111';
const BORDER = '#242424';
const TEXT_PRI = '#FFFFFF';
const TEXT_SEC = '#8E8E93';
const GREEN = '#30D158';
const PURPLE = '#BF5AF2';
const GOLD = '#FFD60A';

const ProfileScreen = () => {
  const router = useRouter();
  const { tasks, completedTasks, isPremium, showAlert } = useStore();
  const [isSyncing, setIsSyncing] = useState(false);

  const stats = useMemo(() => {
    const totalReminders = tasks.length + completedTasks.length;
    const completionRate = totalReminders > 0 
      ? Math.round((completedTasks.length / totalReminders) * 100) 
      : 0;
    
    return {
      totalReminders,
      completionRate,
      activeCount: tasks.length,
      doneCount: completedTasks.length
    };
  }, [tasks, completedTasks]);

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSyncing(true);
    // Simulate RevenueCat restore
    setTimeout(() => {
      setIsSyncing(false);
      showAlert({
        title: 'Sync Complete',
        message: 'Your subscription status has been updated.',
        buttons: [{ text: 'GREAT' }]
      });
    }, 2000);
  };

  const handleUpgrade = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showAlert({
      title: 'Go Premium',
      message: 'Unlock unlimited reminders, cloud sync, and advanced nagging intervals.',
      buttons: [
        { text: 'Later', style: 'cancel' },
        { text: 'Upgrade Now', onPress: () => console.log('RevenueCat Purchase flow') }
      ]
    });
  };

  const StatCard = ({ label, value, icon, color }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        headerShown: true,
        title: 'PROFILE',
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Hero */}
        <View style={styles.hero}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>DR</Text>
            {isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={12} color="#000" />
              </View>
            )}
          </View>
          <Text style={styles.heroName}>Due Reminders User</Text>
          <Text style={styles.heroSub}>Member since 2024</Text>
        </View>

        {/* Subscription Card */}
        <View style={[styles.premiumCard, isPremium && styles.premiumCardActive]}>
          <View style={styles.premiumHeader}>
            <MaterialCommunityIcons 
              name={isPremium ? "shield-check" : "crown"} 
              size={32} 
              color={isPremium ? GREEN : GOLD} 
            />
            <View style={styles.premiumTextContainer}>
              <Text style={styles.premiumTitle}>
                {isPremium ? "PREMIUM ACTIVE" : "UPGRADE TO PRO"}
              </Text>
              <Text style={styles.premiumDesc}>
                {isPremium ? "All features unlocked via RevenueCat" : "Get unlimited reminders & cloud sync"}
              </Text>
            </View>
          </View>
          
          {!isPremium ? (
            <TouchableOpacity style={styles.upgradeBtn} onPress={handleUpgrade}>
              <Text style={styles.upgradeBtnText}>VIEW PLANS</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.activeIndicator}>
              <Text style={styles.activeText}>LIFETIME PASS</Text>
            </View>
          )}

          <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={isSyncing}>
            {isSyncing ? (
              <ActivityIndicator size="small" color={TEXT_SEC} />
            ) : (
              <Text style={styles.restoreText}>RESTORE PURCHASES</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>PERFORMANCE</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Reminders" value={stats.totalReminders} icon="list" color={ACCENT} />
          <StatCard label="Done" value={stats.doneCount} icon="checkmark-done" color={GREEN} />
          <StatCard label="Efficiency" value={`${stats.completionRate}%`} icon="speedometer" color={PURPLE} />
        </View>

        <Text style={styles.sectionTitle}>APP STATUS</Text>
        <View style={styles.statusList}>
          <View style={styles.statusRow}>
            <Ionicons name="cloud-done" size={20} color={TEXT_SEC} />
            <Text style={styles.statusLabel}>Cloud Sync</Text>
            <Text style={styles.statusValue}>{isPremium ? "Enabled" : "Disabled"}</Text>
          </View>
          <View style={styles.statusRow}>
            <Ionicons name="shield-checkmark" size={20} color={TEXT_SEC} />
            <Text style={styles.statusLabel}>Data Encryption</Text>
            <Text style={styles.statusValue}>AES-256</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>DUE REMINDERS PRO</Text>
          <Text style={styles.footerSub}>POWERED BY REVENUECAT</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingBottom: 100 },
  hero: { alignItems: 'center', marginVertical: 32 },
  avatarLarge: { width: 100, height: 100, borderRadius: 50, backgroundColor: SURFACE, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: BORDER },
  avatarLargeText: { fontSize: 32, fontWeight: '900', color: ACCENT },
  premiumBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: GOLD, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#000' },
  heroName: { fontSize: 24, fontWeight: '800', color: TEXT_PRI, marginTop: 16 },
  heroSub: { fontSize: 14, color: TEXT_SEC, marginTop: 4, fontWeight: '600' },
  
  premiumCard: { backgroundColor: SURFACE, borderRadius: 24, padding: 24, marginBottom: 32, borderWidth: 1, borderColor: BORDER },
  premiumCardActive: { borderColor: GREEN + '40' },
  premiumHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  premiumTextContainer: { marginLeft: 16 },
  premiumTitle: { fontSize: 18, fontWeight: '900', color: TEXT_PRI, letterSpacing: 1 },
  premiumDesc: { fontSize: 12, color: TEXT_SEC, marginTop: 2, fontWeight: '600' },
  
  upgradeBtn: { backgroundColor: ACCENT, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  upgradeBtnText: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 2 },
  activeIndicator: { backgroundColor: GREEN + '15', paddingVertical: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: GREEN + '30' },
  activeText: { color: GREEN, fontWeight: '900', fontSize: 12, letterSpacing: 2 },
  
  restoreBtn: { marginTop: 16, alignItems: 'center' },
  restoreText: { color: TEXT_SEC, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  
  sectionTitle: { fontSize: 11, fontWeight: '900', color: TEXT_SEC, letterSpacing: 2, marginBottom: 16, marginLeft: 4 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statCard: { flex: 1, backgroundColor: SURFACE, borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  statIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 20, fontWeight: '900', color: TEXT_PRI },
  statLabel: { fontSize: 10, color: TEXT_SEC, fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },
  
  statusList: { backgroundColor: SURFACE, borderRadius: 24, padding: 8, borderWidth: 1, borderColor: BORDER },
  statusRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  statusLabel: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '600', color: TEXT_PRI },
  statusValue: { fontSize: 13, color: TEXT_SEC, fontWeight: '700' },
  
  footer: { marginTop: 40, alignItems: 'center' },
  footerText: { fontSize: 10, fontWeight: '900', color: TEXT_SEC, letterSpacing: 4 },
  footerSub: { fontSize: 8, fontWeight: '800', color: BORDER, marginTop: 8, letterSpacing: 1 },
});

export default ProfileScreen;
