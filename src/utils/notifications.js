import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─── Notification Category IDs ────────────────────────────────────────────────
export const CATEGORY_REMINDER = 'reminder_actions';

// ─── Handler: show banners even when app is in foreground ─────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Setup: permissions + channel + categories ────────────────────────────────
export const requestPermissions = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Noir] Notification permissions not granted!');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0A84FF',
      enableVibration: true,
      showBadge: true,
    });
  }

  return true;
};

// ─── Setup Interactive Action Buttons ─────────────────────────────────────────
export const setupNotificationCategories = async () => {
  await Notifications.setNotificationCategoryAsync(CATEGORY_REMINDER, [
    {
      identifier: 'complete',
      buttonTitle: 'Complete',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'snooze_10m',
      buttonTitle: '+10 Min',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'snooze_1h',
      buttonTitle: 'Snooze 1 Hour',
      options: { opensAppToForeground: true },
    },
  ]);
  console.log('[Noir] Notification categories registered.');
};

// ─── Schedule Reminder ─────────────────────────────────────────────────────────
export const scheduleNaggingNotifications = async (task) => {
  if (!task || !task.due_at) return [];

  const now = Date.now();
  const secondsUntilDue = Math.floor((task.due_at - now) / 1000);

  if (secondsUntilDue <= 5) {
    console.log(`[Noir] Skipping past task: "${task.title}"`);
    return [];
  }

  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[Noir] Permission denied. Cannot schedule reminders.');
      return [];
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0A84FF',
        enableVibration: true,
        showBadge: true,
      });
    }

    // Cancel old notifications for this task before rescheduling
    await cancelTaskNotifications(task.id);

    const scheduledIds = [];

    // ── Primary Reminder at exact due time ─────────────────────────────────
    console.log(`[Noir] Scheduling "${task.title}" at ${new Date(task.due_at).toLocaleTimeString()}`);

    const primaryId = await Notifications.scheduleNotificationAsync({
      content: {
        title: task.title,
        body: task.description || 'Tap to view details.',
        data: { taskId: task.id, dueAt: task.due_at },
        sound: true,
        color: '#0A84FF',           // App accent color
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: CATEGORY_REMINDER,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(task.due_at),
        channelId: 'default',
      },
    });
    scheduledIds.push(primaryId);
    console.log(`[Noir] ✅ Primary reminder scheduled. ID: ${primaryId}`);

    // ── Nagging follow-ups ──────────────────────────────────────────────────
    if (task.nag_interval && task.nag_interval > 0) {
      for (let i = 1; i <= 3; i++) {
        const nagTime = task.due_at + (i * task.nag_interval * 60 * 1000);
        const nagId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `Pending: ${task.title}`,
            body: `Follow-up reminder #${i}. Use the actions below.`,
            data: { taskId: task.id, dueAt: task.due_at },
            sound: true,
            color: '#0A84FF',
            priority: Notifications.AndroidNotificationPriority.MAX,
            categoryIdentifier: CATEGORY_REMINDER,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(nagTime),
            channelId: 'default',
          },
        });
        scheduledIds.push(nagId);
      }
      console.log(`[Noir] ✅ ${scheduledIds.length - 1} nagging reminders scheduled.`);
    }

    return scheduledIds;
  } catch (error) {
    console.error('[Noir] ❌ Failed to schedule notification:', error);
    return [];
  }
};

// ─── Cancel all notifications for a task ──────────────────────────────────────
export const cancelTaskNotifications = async (taskId) => {
  if (!taskId) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.taskId === taskId) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (e) {
    console.warn('[Noir] Could not cancel notifications:', e);
  }
};
