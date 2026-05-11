import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRouter, Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import useStore from '../../src/store/useStore';

const { width } = Dimensions.get('window');

// ─── Design Tokens ────────────────────────────────────────────────────────────
const ACCENT = '#0A84FF';
const RED = '#FF453A';
const ORANGE = '#FF9F0A';
const GREEN = '#30D158';
const PURPLE = '#BF5AF2';
const SURFACE = '#111111';
const SURFACE2 = '#1A1A1A';
const BORDER = '#242424';
const TEXT_PRI = '#FFFFFF';
const TEXT_SEC = '#8E8E93';
const TEXT_TER = '#3A3A3C';

const CATEGORY_META = {
  bill: { icon: 'card', color: ORANGE, label: 'Bill' },
  person: { icon: 'person', color: PURPLE, label: 'Person' },
  work: { icon: 'briefcase', color: ACCENT, label: 'Work' },
  call: { icon: 'call', color: GREEN, label: 'Call' },
  email: { icon: 'mail', color: ACCENT, label: 'Email' },
  general: { icon: 'ellipse', color: TEXT_SEC, label: 'General' },
};

const PRIORITY_COLOR = { high: RED, medium: ORANGE, low: GREEN };

const CATEGORY_ICONS = {
  bill: 'credit-card',
  person: 'user',
  work: 'briefcase',
  call: 'phone',
  email: 'mail',
  general: 'hash',
};

const PRIORITY_META = {
  high: { label: 'High', color: RED, icon: 'flag' },
  medium: { label: 'Medium', color: ORANGE, icon: 'flag' },
  low: { label: 'Low', color: GREEN, icon: 'flag' },
};


const formatRelative = (ms) => {
  const diff = ms - Date.now();
  const abs = Math.abs(diff);
  const m = Math.floor(abs / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (diff < 0) {
    if (d > 0) return `${d}d overdue`;
    if (h > 0) return `${h}h overdue`;
    return `${m || 1}m overdue`;
  }
  if (d > 0) return `in ${d}d`;
  if (h > 0) return `in ${h}h`;
  if (m > 0) return `in ${m}m`;
  return 'Due now';
};

// Color based on urgency: overdue/< 1h → red, < 24h → amber, ≥ 24h → green
const getUrgencyColor = (ms) => {
  const diff = ms - Date.now();
  if (diff <= 0) return RED;    // overdue
  if (diff < 60 * 60 * 1000) return RED;    // < 1 hour
  if (diff < 24 * 60 * 60 * 1000) return ORANGE; // < 24 hours
  return GREEN;                                    // 24h+
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, count, onSeeAll }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionLeft}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count > 0 && (
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{count}</Text>
        </View>
      )}
    </View>
    <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
      <Text style={styles.seeAll}>See All</Text>
    </TouchableOpacity>
  </View>
);

// ─── Modern Due Card ──────────────────────────────────────────────────────────
const ReminderCard = ({ item, onTouch }) => {
  const meta = CATEGORY_META[item.category] || CATEGORY_META.general;
  const timeColor = getUrgencyColor(item.due_at);
  const router = useRouter();
  const { completeTask } = useStore();

  const onComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeTask(item.id);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardTouch}
        onPress={() => onTouch(item.id)}
        activeOpacity={0.75}
      >
        <View style={styles.cardTop}>
          <View style={[styles.cardCatBadge, { borderColor: meta.color + '40' }]}>
            <Ionicons name={meta.icon} size={11} color={meta.color} />
            <Text style={[styles.cardCatText, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
          </View>

          {item.amount > 0 && (
            <View style={styles.cardAmountBadge}>
              <Text style={styles.cardAmountText}>{item.currency || '$'}{item.amount.toFixed(2)}</Text>
            </View>
          )}

          {item.priority === 'high' && (
            <MaterialCommunityIcons name="lightning-bolt" size={12} color={RED} />
          )}
        </View>

        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.cardTimeRow}>
            <View style={[styles.cardStatusDot, { backgroundColor: timeColor }]} />
            <Text style={[styles.cardTimeText, { color: timeColor }]}>
              {formatRelative(item.due_at)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onComplete}
            style={styles.cardCheckBtn}
          >
            <Ionicons name="checkmark" size={14} color={GREEN} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// ─── Overdue Card (special urgent style) ─────────────────────────────────────
const OverdueCard = ({ task, onPress }) => {
  const meta = CATEGORY_META[task.category] || CATEGORY_META.general;
  const timeStr = formatRelative(task.due_at);
  const timeColor = getUrgencyColor(task.due_at);

  return (
    <TouchableOpacity style={styles.overdueCard} onPress={onPress} activeOpacity={0.72}>
      <View style={[styles.overdueIconWrap, { backgroundColor: meta.color + '18' }]}>
        <Ionicons name={meta.icon} size={19} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.dueCardTitle} numberOfLines={1}>{task.title}</Text>
        <Text style={[styles.dueCardDesc, { color: timeColor, marginTop: 2 }]}>{timeStr}</Text>
      </View>
      <View style={styles.urgentDot} />
    </TouchableOpacity>
  );
};

const HistoryCard = ({ item }) => {
  const router = useRouter();
  const { deleteTask, uncompleteTask, showAlert } = useStore();
  const meta = CATEGORY_META[item.category] || CATEGORY_META.general;

  const createdDate = new Date(item.created_at);
  const timeStr = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const onRestore = () => {
    router.push({ pathname: '/create-reminder', params: { editId: item.id } });
  };

  const onDelete = () => {
    showAlert({
      title: 'Delete',
      message: 'Permanently remove from history?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            deleteTask(item.id, true);
          }
        }
      ]
    });
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => router.push(`/view-reminder?id=${item.id}`)}
        activeOpacity={0.8}
        style={styles.cardTouch}
      >
        <View style={styles.cardTop}>
          <View style={[styles.cardCatBadge, { borderColor: meta.color + '40' }]}>
            <Feather name={CATEGORY_ICONS[item.category] || 'hash'} size={10} color={meta.color} />
            <Text style={[styles.cardCatText, { color: meta.color }]}>{item.category?.toUpperCase()}</Text>
          </View>

          {item.amount > 0 && (
            <View style={styles.amountBadge}>
              <Text style={styles.amountText}>{item.currency || '$'}{item.amount.toFixed(2)}</Text>
            </View>
          )}

          {item.priority === 'high' && (
            <MaterialCommunityIcons name="lightning-bolt" size={12} color={RED} />
          )}
        </View>

        <Text style={[styles.cardTitle, { color: TEXT_SEC, textDecorationLine: 'line-through' }]} numberOfLines={1}>{item.title}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.cardInfoRow}>
            <Ionicons name="checkmark-circle" size={12} color={GREEN} style={{ marginRight: 6 }} />
            <Text style={styles.cardDateText}>Completed at {timeStr}</Text>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={onRestore}
              style={[styles.miniActionBtn, { backgroundColor: '#34C75915', borderColor: '#34C75930' }]}
            >
              <Ionicons name="refresh-outline" size={14} color="#34C759" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onDelete}
              style={[styles.miniActionBtn, { backgroundColor: RED + '15', borderColor: RED + '30' }]}
            >
              <Ionicons name="trash" size={12} color={RED} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// ─── Empty placeholder ────────────────────────────────────────────────────────
const EmptySection = ({ message }) => (
  <View style={styles.emptySection}>
    <Ionicons name="checkmark-circle" size={16} color={GREEN} />
    <Text style={styles.emptySectionText}>{message}</Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { tasks, completedTasks } = useStore();
  const router = useRouter();
  const now = Date.now();

  const startOfDay = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
  }, []);
  const endOfDay = startOfDay + 86400000;

  const overdue = useMemo(() => tasks.filter(t => t.due_at < now).sort((a, b) => a.due_at - b.due_at), [tasks]);
  const today = useMemo(() => tasks.filter(t => t.due_at >= now && t.due_at < endOfDay), [tasks]);
  const upcoming = useMemo(() => tasks.filter(t => t.due_at >= endOfDay).slice(0, 5), [tasks]);
  const recentlyCompleted = useMemo(() => completedTasks.slice(0, 3), [completedTasks]);

  const goReminders = () => router.push('/reminders');
  const goView = (id) => router.push(`/view-reminder?id=${id}`);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <View style={styles.hero}>
        <Text style={styles.heroDate}>
          {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
        </Text>

        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>
              {tasks.length === 0 ? 'All Clear' : `${tasks.length} Due`}
            </Text>
            <Text style={styles.heroSub}>
              {overdue.length > 0
                ? `${overdue.length} overdue — needs attention`
                : tasks.length > 0
                  ? 'Track your dues & reminders'
                  : 'No pending reminders'}
            </Text>
          </View>

          {/* Overdue ring */}
          <View style={[styles.ringWrap, overdue.length > 0 && { borderColor: RED + '50' }]}>
            <Text style={[styles.ringNum, overdue.length > 0 && { color: RED }]}>
              {overdue.length}
            </Text>
            <Text style={styles.ringLabel}>OVERDUE</Text>
          </View>
        </View>

        {/* History pill */}
        <TouchableOpacity style={styles.historyPill} onPress={() => router.push('/history')}>
          <Ionicons name="time-outline" size={13} color={TEXT_SEC} />
          <Text style={styles.historyPillText}>{completedTasks.length} completed</Text>
          <Ionicons name="chevron-forward" size={12} color={TEXT_TER} />
        </TouchableOpacity>
      </View>

      {/* ── Overdue ──────────────────────────────────────────────────── */}
      {overdue.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Overdue" count={overdue.length} onSeeAll={goReminders} />
          <View style={styles.alertBanner}>
            <Ionicons name="alert-circle" size={14} color={RED} />
            <Text style={styles.alertBannerText}>Immediate attention required</Text>
          </View>
          {overdue.slice(0, 5).map(t => (
            <OverdueCard key={t.id} task={t} onPress={() => goView(t.id)} />
          ))}
        </View>
      )}

      {/* ── Due Today ────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="Due Today" count={today.length} onSeeAll={goReminders} />
        {today.length === 0
          ? <EmptySection message="Nothing due today" />
          : today.slice(0, 5).map(t => (
            <ReminderCard key={t.id} item={t} onTouch={goView} />
          ))
        }
      </View>

      {/* ── Upcoming ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="Upcoming" count={upcoming.length} onSeeAll={goReminders} />
        {upcoming.length === 0
          ? <EmptySection message="Nothing coming up" />
          : upcoming.map(t => (
            <ReminderCard key={t.id} item={t} onTouch={goView} />
          ))
        }
      </View>

      {/* ── Recently Completed ────────────────────────────────────────── */}
      {recentlyCompleted.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Completed" count={completedTasks.length} onSeeAll={() => router.push('/history')} />
          {recentlyCompleted.map(t => (
            <HistoryCard key={t.id} item={t} />
          ))}
        </View>
      )}

      {/* ── By Category ──────────────────────────────────────────────── */}
      {tasks.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="By Category" count={0} onSeeAll={goReminders} />
          <View style={styles.categoryGrid}>
            {Object.entries(CATEGORY_META).map(([key, meta]) => {
              const count = tasks.filter(t => t.category === key).length;
              if (!count) return null;
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.categoryChip}
                  onPress={goReminders}
                  activeOpacity={0.72}
                >
                  <View style={[styles.categoryChipIcon, { backgroundColor: meta.color + '18' }]}>
                    <Ionicons name={meta.icon} size={15} color={meta.color} />
                  </View>
                  <Text style={styles.categoryChipLabel}>{meta.label}</Text>
                  <Text style={[styles.categoryChipCount, { color: meta.color }]}>{count}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* ── By Priority ──────────────────────────────────────────────── */}
      {tasks.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="By Priority" count={0} onSeeAll={goReminders} />
          <View style={styles.categoryGrid}>
            {Object.entries(PRIORITY_META).map(([key, meta]) => {
              const count = tasks.filter(t => t.priority === key).length;
              if (!count) return null;
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.categoryChip}
                  onPress={goReminders}
                  activeOpacity={0.72}
                >
                  <View style={[styles.categoryChipIcon, { backgroundColor: meta.color + '18' }]}>
                    <Ionicons name={meta.icon} size={15} color={meta.color} />
                  </View>
                  <Text style={styles.categoryChipLabel}>{meta.label}</Text>
                  <Text style={[styles.categoryChipCount, { color: meta.color }]}>{count}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}


      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { paddingBottom: 120 },

  // Hero
  hero: {
    paddingHorizontal: 22, paddingTop: 20, paddingBottom: 24,
    borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 4,
  },
  heroDate: { fontSize: 10, fontWeight: '800', color: TEXT_SEC, letterSpacing: 2, marginBottom: 18 },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  heroTitle: { fontSize: 38, fontWeight: '800', color: TEXT_PRI, letterSpacing: -2 },
  heroSub: { fontSize: 13, color: TEXT_SEC, marginTop: 6, fontWeight: '500', lineHeight: 18 },

  ringWrap: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: SURFACE2,
    borderWidth: 1.5, borderColor: BORDER,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 14,
  },
  ringNum: { fontSize: 26, fontWeight: '800', color: TEXT_PRI, letterSpacing: -1 },
  ringLabel: { fontSize: 7.5, fontWeight: '800', color: TEXT_SEC, letterSpacing: 1 },

  historyPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: SURFACE, borderRadius: 20,
    paddingVertical: 9, paddingHorizontal: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  historyPillText: { fontSize: 12, color: TEXT_SEC, fontWeight: '600' },

  // Sections
  section: { paddingHorizontal: 18, paddingTop: 26 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: TEXT_PRI, letterSpacing: -0.4 },
  sectionBadge: {
    backgroundColor: SURFACE2, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: BORDER,
  },
  sectionBadgeText: { fontSize: 11, color: TEXT_SEC, fontWeight: '700' },
  seeAll: { fontSize: 13, color: ACCENT, fontWeight: '600' },

  // Alert banner
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: RED + '10', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
    borderWidth: 1, borderColor: RED + '25',
  },
  alertBannerText: { fontSize: 12, color: RED, fontWeight: '600' },

  // Overdue card
  overdueCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACE, borderRadius: 16,
    padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: RED + '22',
  },
  overdueIconWrap: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  urgentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: RED },

  // Modern due card
  card: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  cardTouch: {
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardCatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  cardCatText: {
    fontSize: 8,
    fontWeight: '900',
    marginLeft: 4,
    letterSpacing: 1,
  },
  // History Card Styles (Synced with history.js)
  amountBadge: {
    backgroundColor: GREEN + '10',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  amountText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: '900',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_PRI,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 12,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_SEC,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  miniActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  // Empty
  emptySection: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: SURFACE, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  emptySectionText: { fontSize: 13, color: TEXT_SEC, fontWeight: '500' },

  // Category chips
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: SURFACE, borderRadius: 22,
    paddingVertical: 9, paddingHorizontal: 13,
    borderWidth: 1, borderColor: BORDER,
  },
  categoryChipIcon: { width: 26, height: 26, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  categoryChipLabel: { fontSize: 13, fontWeight: '700', color: TEXT_PRI },
  categoryChipCount: { fontSize: 13, fontWeight: '800' },
});
