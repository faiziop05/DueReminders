import React, { useEffect, useCallback } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import { requestPermissions, setupNotificationCategories, scheduleNaggingNotifications, cancelTaskNotifications } from '../../src/utils/notifications';
import useStore from '../../src/store/useStore';

const ACCENT = '#0A84FF';
const SURFACE = '#1C1C1E';
const BORDER = '#38383A';
const TEXT_PRIMARY = '#FFFFFF';

export default function TabLayout() {
  const router = useRouter();
  const { completeTask, updateTaskTime, tasks } = useStore();

  useEffect(() => {
    const setup = async () => {
      const granted = await requestPermissions();
      if (granted) {
        await setupNotificationCategories();
        console.log('[Noir] Notifications initialized.');
      }
    };
    setup();
  }, []);

  // ── Shared action handler (used by both cold-start and live listener) ────────
  const handleNotificationAction = useCallback(async (response) => {
    if (!response) return;

    const actionId = response.actionIdentifier;
    // DEFAULT_ACTION_IDENTIFIER means user tapped the notification body itself
    if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) return;

    const { taskId, dueAt } = response.notification.request.content.data || {};
    if (!taskId) return;

    console.log(`[Noir] Handling action "${actionId}" for task ${taskId}`);

    if (actionId === 'complete') {
      await completeTask(taskId);
      await cancelTaskNotifications(taskId);
      console.log(`[Noir] Task ${taskId} marked complete.`);

    } else if (actionId === 'snooze_10m') {
      const newDue = (dueAt || Date.now()) + 10 * 60 * 1000;
      await updateTaskTime(taskId, newDue);
      // Re-fetch task from store after update
      const task = useStore.getState().tasks.find(t => t.id === taskId);
      if (task) await scheduleNaggingNotifications({ ...task, due_at: newDue });
      console.log(`[Noir] Task ${taskId} snoozed +10 minutes.`);

    } else if (actionId === 'snooze_1h') {
      const newDue = (dueAt || Date.now()) + 60 * 60 * 1000;
      await updateTaskTime(taskId, newDue);
      const task = useStore.getState().tasks.find(t => t.id === taskId);
      if (task) await scheduleNaggingNotifications({ ...task, due_at: newDue });
      console.log(`[Noir] Task ${taskId} snoozed +1 hour.`);
    }
  }, [completeTask, updateTaskTime]);

  useEffect(() => {
    // ── Cold-start: app was killed, user tapped a notification action ──────────
    Notifications.getLastNotificationResponseAsync().then(async (response) => {
      if (response) {
        console.log('[Noir] Cold-start notification action detected.');

        // Wait until the store has finished initializing (DB is open + data loaded)
        // Poll every 100ms, timeout after 10 seconds
        const waitForStore = () => new Promise((resolve) => {
          let elapsed = 0;
          const check = () => {
            if (!useStore.getState().isLoading) {
              resolve();
            } else if (elapsed >= 10000) {
              console.warn('[Noir] Store init timeout — proceeding anyway.');
              resolve();
            } else {
              elapsed += 100;
              setTimeout(check, 100);
            }
          };
          check();
        });

        await waitForStore();
        await handleNotificationAction(response);
        Notifications.dismissAllNotificationsAsync();
      }
    });

    // ── Live listener: app is in background/foreground ────────────────────────
    const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationAction);

    return () => subscription.remove();
  }, [handleNotificationAction]);


  const handleFabPress = () => {
    router.push('/create-reminder');

  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <Tabs
        screenOptions={{
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
          headerLeft: () => (
            <TouchableOpacity
              style={{ marginLeft: 20 }}
              onPress={() => router.push('/profile')}
            >
              <View style={styles.headerIconCircle}>
                <Ionicons name="person" size={20} color={ACCENT} />
              </View>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 20 }}
              onPress={() => router.push('/settings')}
            >
              <Ionicons name="settings-sharp" size={22} color={ACCENT} />
            </TouchableOpacity>
          ),
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
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'DUE',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="reminders"
          options={{
            title: 'REMINDERS',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="timers"
          options={{
            href: null, // Hidden from tab bar
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null, // Hidden from tab bar
          }}
        />
      </Tabs>

      {/* Modern FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleFabPress}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1C1C1E',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 110,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 190,
  },
  menuContainer: {
    width: '90%',
    backgroundColor: SURFACE,
    borderRadius: 30,
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
