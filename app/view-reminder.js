import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, LayoutAnimation,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import useStore from '../src/store/useStore';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const ACCENT   = '#0A84FF';
const RED      = '#FF453A';
const ORANGE   = '#FF9F0A';
const GREEN    = '#30D158';
const PURPLE   = '#BF5AF2';
const SURFACE  = '#111111';
const SURFACE2 = '#1A1A1A';
const BORDER   = '#242424';
const TEXT_PRI = '#FFFFFF';
const TEXT_SEC = '#8E8E93';
const TEXT_TER = '#3A3A3C';

const CATEGORY_META = {
  bill:    { icon: 'card',      color: ORANGE, label: 'Bill'    },
  person:  { icon: 'person',    color: PURPLE, label: 'Person'  },
  work:    { icon: 'briefcase', color: ACCENT, label: 'Work'    },
  call:    { icon: 'call',      color: GREEN,  label: 'Call'    },
  email:   { icon: 'mail',      color: ACCENT, label: 'Email'   },
  general: { icon: 'ellipse',   color: TEXT_SEC, label: 'General'},
};

const PRIORITY_META = {
  high:   { label: 'High',   color: RED    },
  medium: { label: 'Medium', color: ORANGE },
  low:    { label: 'Low',    color: GREEN  },
};

const NAG_INTERVALS = [
  { label: 'OFF', value: 0 },
  { label: '1m', value: 1 },
  { label: '5m', value: 5 },
  { label: '15m', value: 15 },
  { label: '1h', value: 60 },
];

const formatFullDate = (ms) =>
  new Date(ms).toLocaleDateString([], {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

const formatTime = (ms) =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const getUrgencyColor = (ms) => {
  const diff = ms - Date.now();
  if (diff <= 0)                    return RED;
  if (diff < 60 * 60 * 1000)       return RED;
  if (diff < 24 * 60 * 60 * 1000)  return ORANGE;
  return GREEN;
};

const formatRelative = (ms) => {
  const diff = ms - Date.now();
  const abs  = Math.abs(diff);
  const m    = Math.floor(abs / 60000);
  const h    = Math.floor(m / 60);
  const d    = Math.floor(h / 24);
  if (diff < 0) {
    if (d > 0) return `${d} day${d > 1 ? 's' : ''} overdue`;
    if (h > 0) return `${h} hour${h > 1 ? 's' : ''} overdue`;
    return `${m || 1} minute${m > 1 ? 's' : ''} overdue`;
  }
  if (d > 0) return `Due in ${d} day${d > 1 ? 's' : ''}`;
  if (h > 0) return `Due in ${h} hour${h > 1 ? 's' : ''}`;
  if (m > 0) return `Due in ${m} minute${m > 1 ? 's' : ''}`;
  return 'Due right now';
};

// ─── Components ───────────────────────────────────────────────────────────────

const QuickActionTile = ({ value, unit, onPlus, onMinus }) => (
  <View style={styles.quickActionTile}>
    <TouchableOpacity style={styles.tilePart} onPress={onPlus} activeOpacity={0.7}>
      <Text style={[styles.tileValue, { color: ACCENT }]}>+{value}</Text>
      <Text style={styles.tileUnit}>{unit}</Text>
    </TouchableOpacity>
    <View style={styles.tileSeparator} />
    <TouchableOpacity style={styles.tilePart} onPress={onMinus} activeOpacity={0.7}>
      <Text style={[styles.tileValue, { color: RED }]}>-{value}</Text>
      <Text style={styles.tileUnit}>{unit}</Text>
    </TouchableOpacity>
  </View>
);

const LifeClock = ({ dueAt, isCompleted }) => {
  const [display, setDisplay] = useState({ primary: '', secondary: '', color: ACCENT, overdue: false });

  useEffect(() => {
    if (isCompleted) {
      setDisplay({ primary: 'COMPLETED', secondary: 'Mission Accomplished', color: GREEN, overdue: false });
      return;
    }

    const update = () => {
      const now = new Date();
      const target = new Date(dueAt);
      const diff = dueAt - now.getTime();

      if (diff <= 0) {
        setDisplay({ primary: 'OVERDUE', secondary: 'Time is up', color: RED, overdue: true });
        return;
      }

      let years = target.getFullYear() - now.getFullYear();
      let months = target.getMonth() - now.getMonth();
      let days = target.getDate() - now.getDate();
      let hours = target.getHours() - now.getHours();
      let minutes = target.getMinutes() - now.getMinutes();
      let seconds = target.getSeconds() - now.getSeconds();

      if (seconds < 0) { minutes--; seconds += 60; }
      if (minutes < 0) { hours--; minutes += 60; }
      if (hours < 0) { days--; hours += 24; }
      if (days < 0) {
        months--;
        const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0).getDate();
        days += prevMonth;
      }
      if (months < 0) { years--; months += 12; }

      const timePart = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      let primary = '';
      let secondary = '';
      let color = getUrgencyColor(dueAt);

      if (years > 0) {
        primary = `${years}y ${months}m ${days}d`;
        secondary = timePart;
      } else if (months > 0) {
        primary = `${months}m ${days}d`;
        secondary = timePart;
      } else if (days > 0) {
        primary = `${days}d ${hours}h`;
        secondary = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        primary = timePart;
        secondary = '';
      }

      setDisplay({ primary, secondary, color, overdue: false });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [dueAt]);

  return (
    <View style={[
      styles.clockContainer, 
      { borderColor: `${display.color}30` }, 
      display.overdue && { backgroundColor: RED + '10' },
      isCompleted && { backgroundColor: GREEN + '08' }
    ]}>
      <View style={[styles.clockIconBox, { borderColor: `${display.color}20` }]}>
        <Feather name={isCompleted ? "check-circle" : (display.overdue ? "alert-circle" : "clock")} size={16} color={display.color} />
      </View>
      <View style={styles.clockDisplay}>
        <Text style={[styles.clockPrimary, { color: display.color }]}>{display.primary}</Text>
        {display.secondary ? <Text style={styles.clockSecondary}>{display.secondary}</Text> : null}
      </View>
    </View>
  );
};

const DetailRow = ({ icon, iconColor, label, value, valueColor }) => (
  <View style={styles.detailRow}>
    <View style={[styles.detailIcon, { backgroundColor: iconColor + '15' }]}>
      <Ionicons name={icon} size={16} color={iconColor} />
    </View>
    <View style={styles.detailText}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  </View>
);

const ActionButton = ({ icon, label, color, onPress, outlined }) => (
  <TouchableOpacity
    style={[
      styles.actionBtn,
      outlined
        ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: color + '50' }
        : { backgroundColor: color },
    ]}
    onPress={onPress}
    activeOpacity={0.78}
  >
    <Ionicons name={icon} size={18} color={outlined ? color : '#fff'} />
    <Text style={[styles.actionBtnText, { color: outlined ? color : '#fff' }]}>{label}</Text>
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ViewReminderScreen() {
  const { id } = useLocalSearchParams();
  const router  = useRouter();
  const { tasks, completedTasks, completeTask, uncompleteTask, deleteTask, updateTaskTime, updateTask, showAlert } = useStore();

  const task = useMemo(() => {
    const tid = parseInt(id);
    return tasks.find(t => t.id === tid) || completedTasks.find(t => t.id === tid);
  }, [tasks, completedTasks, id]);

  if (!task) {
    return (
      <View style={styles.notFound}>
        <Ionicons name="checkmark-done-circle" size={52} color={GREEN} />
        <Text style={styles.notFoundTitle}>Already Completed</Text>
        <Text style={styles.notFoundSub}>This reminder has been marked done</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const meta     = CATEGORY_META[task.category] || CATEGORY_META.general;
  const pri      = PRIORITY_META[task.priority]  || PRIORITY_META.medium;
  const timeColor = getUrgencyColor(task.due_at);

  const handleComplete = () => {
    showAlert({
      title: 'Mark as Complete',
      message: `Mark "${task.title}" as done?`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await completeTask(task.id);
            router.back();
          },
        },
      ],
    });
  };

  const handleRestore = () => {
    // Navigate to Edit screen for restoration
    router.push(`/create-reminder?editId=${task.id}`);
  };

  const handleDelete = () => {
    showAlert({
      title: 'Delete Reminder',
      message: `Delete "${task.title}"? This cannot be undone.`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await deleteTask(task.id, task.status === 'completed');
            router.back();
          },
        },
      ],
    });
  };

  const handleAdjustTime = (years, months, hours, mins) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDate = new Date(task.due_at);
    if (years) newDate.setFullYear(newDate.getFullYear() + years);
    if (months) newDate.setMonth(newDate.getMonth() + months);
    if (hours) newDate.setHours(newDate.getHours() + hours);
    if (mins) newDate.setMinutes(newDate.getMinutes() + mins);
    updateTaskTime(task.id, newDate.getTime());
  };

  const handleNagChange = (val) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateTask(task.id, { nag_interval: val });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'REMINDER',
          headerStyle: { backgroundColor: '#000000' },
          headerTitleStyle: { color: TEXT_PRI, fontWeight: '900', fontSize: 13, letterSpacing: 4 },
          headerTintColor: ACCENT,
          headerShadowVisible: false,
          headerRight: () => (
            task.status !== 'completed' && (
              <TouchableOpacity onPress={() => router.push(`/create-reminder?editId=${task.id}`)} style={{ marginRight: 16 }}>
                <Text style={{ color: ACCENT, fontSize: 15, fontWeight: '600' }}>Edit</Text>
              </TouchableOpacity>
            )
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Life Clock ─────────────────────────────────────────────── */}
        <LifeClock dueAt={task.due_at} isCompleted={task.status === 'completed'} />

        {/* ── Hero Card ──────────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={[styles.heroIconWrap, { backgroundColor: meta.color + '18' }]}>
            <Ionicons name={meta.icon} size={28} color={meta.color} />
          </View>
          <View style={[styles.categoryChip, { backgroundColor: meta.color + '12', borderColor: meta.color + '30' }]}>
            <Text style={[styles.categoryChipText, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
          </View>
          <Text style={styles.heroTitle}>{task.title}</Text>
          {task.description ? <Text style={styles.heroDesc}>{task.description}</Text> : null}
          
          {task.amount > 0 && (
            <View style={styles.amountHero}>
              <Text style={styles.amountHeroLabel}>AMOUNT DUE</Text>
              <Text style={styles.amountHeroValue}>{task.currency || '$'}{task.amount.toFixed(2)}</Text>
            </View>
          )}

          <View style={[styles.timeBanner, { backgroundColor: (task.status === 'completed' ? GREEN : timeColor) + '12', borderColor: (task.status === 'completed' ? GREEN : timeColor) + '30' }]}>
            <View style={[styles.timeBannerDot, { backgroundColor: task.status === 'completed' ? GREEN : timeColor }]} />
            <Text style={[styles.timeBannerText, { color: task.status === 'completed' ? GREEN : timeColor }]}>
              {task.status === 'completed' ? 'COMPLETED' : formatRelative(task.due_at)}
            </Text>
          </View>
        </View>

        {/* ── Quick Adjust ────────────────────────────────────────────── */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsSectionTitle}>Quick Adjust Time</Text>
          <View style={styles.quickTilesRow}>
            <QuickActionTile value="1" unit="Year" onPlus={() => handleAdjustTime(1, 0, 0, 0)} onMinus={() => handleAdjustTime(-1, 0, 0, 0)} />
            <QuickActionTile value="1" unit="Month" onPlus={() => handleAdjustTime(0, 1, 0, 0)} onMinus={() => handleAdjustTime(0, -1, 0, 0)} />
            <QuickActionTile value="1" unit="Hour" onPlus={() => handleAdjustTime(0, 0, 1, 0)} onMinus={() => handleAdjustTime(0, 0, -1, 0)} />
            <QuickActionTile value="10" unit="Min" onPlus={() => handleAdjustTime(0, 0, 0, 10)} onMinus={() => handleAdjustTime(0, 0, 0, -10)} />
          </View>
        </View>

        {/* ── Nag Repeat ─────────────────────────────────────────────── */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsSectionTitle}>Nag Repeat</Text>
          <View style={styles.nagGrid}>
            {NAG_INTERVALS.map((nag) => (
              <TouchableOpacity
                key={nag.value}
                style={[styles.nagBtn, task.nag_interval === nag.value && styles.nagBtnActive]}
                onPress={() => handleNagChange(nag.value)}
              >
                <Text style={[styles.nagText, task.nag_interval === nag.value && styles.nagTextActive]}>{nag.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Details Grid ───────────────────────────────────────────── */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsSectionTitle}>Details</Text>
          <DetailRow icon="calendar-outline" iconColor={ACCENT} label="Due Date" value={formatFullDate(task.due_at)} />
          <View style={styles.detailDivider} />
          <DetailRow icon="time-outline" iconColor={ACCENT} label="Due Time" value={formatTime(task.due_at)} />
          <View style={styles.detailDivider} />
          <DetailRow icon="flag-outline" iconColor={pri.color} label="Priority" value={pri.label} valueColor={pri.color} />
        </View>

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <View style={styles.actionsRow}>
          {task.status === 'completed' ? (
            <ActionButton icon="refresh-outline" label="Restore & Edit" color={ACCENT} onPress={handleRestore} />
          ) : (
            <>
              <ActionButton icon="checkmark" label="Complete" color={GREEN} onPress={handleComplete} />
              <ActionButton icon="create-outline" label="Edit" color={ACCENT} outlined onPress={() => router.push(`/create-reminder?editId=${task.id}`)} />
            </>
          )}
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.75}>
          <Ionicons name="trash-outline" size={16} color={RED} />
          <Text style={styles.deleteBtnText}>Delete Reminder</Text>
        </TouchableOpacity>

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content:   { padding: 18, paddingBottom: 60 },
  notFound:      { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
  notFoundTitle: { fontSize: 20, fontWeight: '700', color: TEXT_PRI },
  notFoundSub:   { fontSize: 14, color: TEXT_SEC, textAlign: 'center' },
  backBtn:       { marginTop: 12, backgroundColor: SURFACE, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  backBtnText:   { color: ACCENT, fontWeight: '700', fontSize: 15 },

  // Life Clock
  clockContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', borderRadius: 20,
    padding: 18, borderWidth: 1, borderColor: BORDER, marginBottom: 12,
  },
  clockIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: SURFACE, justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, borderColor: BORDER },
  clockDisplay: { flex: 1 },
  clockPrimary: { fontSize: 22, fontWeight: '900', letterSpacing: 0.5, fontVariant: ['tabular-nums'] },
  clockSecondary: { fontSize: 12, fontWeight: '700', color: TEXT_SEC, marginTop: 2, letterSpacing: 1, fontVariant: ['tabular-nums'] },

  // Hero card
  heroCard: { backgroundColor: SURFACE, borderRadius: 20, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: BORDER, marginBottom: 12 },
  heroIconWrap: { width: 64, height: 64, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  categoryChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14, borderWidth: 1 },
  categoryChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  heroTitle:    { fontSize: 24, fontWeight: '800', color: TEXT_PRI, textAlign: 'center', letterSpacing: -0.5, marginBottom: 8 },
  heroDesc:     { fontSize: 14, color: TEXT_SEC, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  amountHero: {
    backgroundColor: '#30D15810',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#30D15825',
  },
  amountHeroLabel: {
    color: '#30D158',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  amountHeroValue: {
    color: '#30D158',
    fontSize: 28,
    fontWeight: '900',
  },
  timeBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, marginTop: 4 },
  timeBannerDot:  { width: 7, height: 7, borderRadius: 4 },
  timeBannerText: { fontSize: 14, fontWeight: '700' },

  // Details card
  detailsCard: { backgroundColor: SURFACE, borderRadius: 20, borderWidth: 1, borderColor: BORDER, marginBottom: 12, overflow: 'hidden' },
  detailsSectionTitle: { fontSize: 11, fontWeight: '800', color: TEXT_SEC, letterSpacing: 1.5, textTransform: 'uppercase', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14 },
  detailRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 14 },
  detailDivider:{ height: 1, backgroundColor: BORDER, marginLeft: 68 },
  detailIcon:   { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  detailText:   { flex: 1 },
  detailLabel:  { fontSize: 11, color: TEXT_SEC, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue:  { fontSize: 15, color: TEXT_PRI, fontWeight: '600', marginTop: 2 },

  // Quick Tiles
  quickTilesRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingHorizontal: 18, paddingBottom: 18 },
  quickActionTile: { flex: 1, backgroundColor: '#000', borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  tilePart: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  tileSeparator: { height: 1, backgroundColor: BORDER, marginHorizontal: 8 },
  tileValue: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  tileUnit: { color: TEXT_SEC, fontSize: 8, fontWeight: '800', marginTop: 1, textTransform: 'uppercase' },

  // Nag Grid
  nagGrid: { flexDirection: 'row', backgroundColor: '#000', margin: 18, marginTop: 0, padding: 4, borderRadius: 14, borderWidth: 1, borderColor: BORDER },
  nagBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  nagBtnActive: { backgroundColor: ACCENT },
  nagText: { color: TEXT_SEC, fontSize: 11, fontWeight: '800' },
  nagTextActive: { color: '#FFFFFF' },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 16 },
  actionBtnText: { fontSize: 15, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 16, borderWidth: 1, borderColor: RED + '30', backgroundColor: RED + '08' },
  deleteBtnText: { fontSize: 15, color: RED, fontWeight: '600' },
});
