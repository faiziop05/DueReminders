import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, SectionList,
  TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import useStore from '../src/store/useStore';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const ACCENT   = '#0A84FF';
const GREEN    = '#30D158';
const RED      = '#FF453A';
const ORANGE   = '#FF9F0A';
const PURPLE   = '#BF5AF2';
const SURFACE  = '#111111';
const SURFACE2 = '#1C1C1E';
const BORDER   = '#2C2C2E';
const TEXT_PRI = '#FFFFFF';
const TEXT_SEC = '#8E8E93';

const CATEGORY_META = {
  bill:    { color: ORANGE, icon: 'card' },
  person:  { color: PURPLE, icon: 'person' },
  work:    { color: ACCENT, icon: 'briefcase' },
  call:    { color: GREEN,  icon: 'call' },
  email:   { color: ACCENT, icon: 'mail' },
  general: { color: TEXT_SEC, icon: 'hash' },
};

const CATEGORY_ICONS = {
  bill:    'credit-card',
  person:  'user',
  work:    'briefcase',
  call:    'phone',
  email:   'mail',
  general: 'hash',
};

const groupByDate = (tasks) => {
  const groups = {};
  tasks.forEach(task => {
    const d = new Date(task.created_at);
    const key = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
  });
  return Object.keys(groups).map(title => ({ title, data: groups[title] }));
};

const TIME_FILTERS = ['All', 'Today', 'Week'];

// ─── Components ───────────────────────────────────────────────────────────────

const HistoryCard = ({ item }) => {
  const router = useRouter();
  const { deleteTask, uncompleteTask, showAlert } = useStore();
  const meta = CATEGORY_META[item.category] || CATEGORY_META.general;
  
  const createdDate = new Date(item.created_at);
  const timeStr = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const onRestore = () => {
    // Instead of direct restore, we navigate to Edit screen as requested
    router.push({ pathname: '/create-reminder', params: { editId: item.id } });
  };

  const onDelete = () => {
    showAlert({
      title: 'Delete',
      message: 'Permanently remove from history?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          deleteTask(item.id, true);
        }}
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

        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const { completedTasks } = useStore();
  const [timeFilter, setTimeFilter] = useState('All');
  const [activeTag, setActiveTag] = useState('All'); // Category or Priority
  const router = useRouter();

  const filtered = useMemo(() => {
    let result = [...completedTasks].sort((a, b) => b.created_at - a.created_at);

    // Time filter
    if (timeFilter === 'Today') {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      result = result.filter(t => t.created_at >= start.getTime());
    } else if (timeFilter === 'Week') {
      const start = new Date(); start.setDate(start.getDate() - 7);
      result = result.filter(t => t.created_at >= start.getTime());
    }

    // Category/Priority tag filter
    if (activeTag !== 'All') {
      const tag = activeTag.toLowerCase();
      result = result.filter(t => t.category === tag || t.priority === tag);
    }

    return result;
  }, [completedTasks, timeFilter, activeTag]);

  const sections = useMemo(() => groupByDate(filtered), [filtered]);

  const FilterChip = ({ label, isActive, onPress }) => (
    <TouchableOpacity 
      style={[styles.filterChip, isActive && styles.filterChipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
        {label.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'HISTORY',
          headerStyle: { backgroundColor: '#000' },
          headerTitleStyle: { color: TEXT_PRI, fontWeight: '900', fontSize: 13, letterSpacing: 4 },
          headerShadowVisible: false,
          headerTintColor: ACCENT,
        }}
      />

      <View style={styles.container}>
        {/* Header Controls */}
        <View style={styles.headerControls}>
          <View style={styles.timeFilterRow}>
            {TIME_FILTERS.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.timeTab, timeFilter === f && styles.timeTabActive]}
                onPress={() => setTimeFilter(f)}
              >
                <Text style={[styles.timeTabText, timeFilter === f && styles.timeTabTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll} contentContainerStyle={styles.tagContent}>
            <FilterChip label="All" isActive={activeTag === 'All'} onPress={() => setActiveTag('All')} />
            <View style={styles.tagDivider} />
            <FilterChip label="High" isActive={activeTag === 'High'} onPress={() => setActiveTag('High')} />
            <FilterChip label="Medium" isActive={activeTag === 'Medium'} onPress={() => setActiveTag('Medium')} />
            <FilterChip label="Low" isActive={activeTag === 'Low'} onPress={() => setActiveTag('Low')} />
            <View style={styles.tagDivider} />
            {Object.keys(CATEGORY_META).map(cat => (
              <FilterChip key={cat} label={cat} isActive={activeTag === cat} onPress={() => setActiveTag(cat)} />
            ))}
          </ScrollView>
        </View>

        {/* List */}
        {sections.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyCircle}>
              <Ionicons name="checkmark-done-circle" size={48} color={BORDER} />
            </View>
            <Text style={styles.emptyTitle}>HISTORY CLEAR</Text>
            <Text style={styles.emptySubtitle}>No tasks found with these filters</Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section: { title, data } }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionDate}>{title}</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{data.length}</Text>
                </View>
              </View>
            )}
            renderItem={({ item }) => <HistoryCard item={item} />}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#000' },
  listContent: { paddingBottom: 100, paddingHorizontal: 16 },

  // Header Controls
  headerControls: {
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#000',
  },
  timeFilterRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  timeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeTabActive: {
    backgroundColor: '#2C2C2E',
  },
  timeTabText: {
    fontSize: 11,
    fontWeight: '800',
    color: TEXT_SEC,
    letterSpacing: 0.5,
  },
  timeTabTextActive: {
    color: TEXT_PRI,
  },
  tagScroll: {
    marginBottom: 12,
  },
  tagContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterChipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  filterChipText: {
    color: TEXT_SEC,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  tagDivider: {
    width: 1,
    height: 16,
    backgroundColor: BORDER,
    marginHorizontal: 2,
  },

  // Empty State
  emptyBox:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingBottom: 100 },
  emptyCircle:  { width: 80, height: 80, borderRadius: 40, backgroundColor: SURFACE, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  emptyTitle:   { fontSize: 13, fontWeight: '900', color: TEXT_PRI, letterSpacing: 4 },
  emptySubtitle:{ fontSize: 14, color: TEXT_SEC, fontWeight: '500' },

  // Section Headers
  sectionHeader:    { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 12, gap: 8 },
  sectionDate:      { fontSize: 10, fontWeight: '900', color: TEXT_SEC, textTransform: 'uppercase', letterSpacing: 1.5 },
  sectionBadge:     { backgroundColor: SURFACE, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: BORDER },
  sectionBadgeText: { fontSize: 10, color: TEXT_SEC, fontWeight: '800' },

  // Cards
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
});
