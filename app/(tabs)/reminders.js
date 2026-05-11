import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, LayoutAnimation, Platform, UIManager, ActivityIndicator, ScrollView, TextInput, Dimensions, Alert } from 'react-native';

const { width } = Dimensions.get('window');
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeInUp,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import useStore from '../../src/store/useStore';
import { useRouter, Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ACCENT = '#0A84FF';
const WARNING = '#FF9500';
const DANGER = '#FF3B30';
const SURFACE = '#111111';
const BORDER = '#2C2C2E';
const TEXT_SECONDARY = '#8E8E93';
const TEXT_PRIMARY = '#FFFFFF';

const CATEGORY_META = {
  bill: { color: '#FF9F0A' },
  person: { color: '#BF5AF2' },
  work: { color: '#0A84FF' },
  call: { color: '#30D158' },
  email: { color: '#0A84FF' },
  general: { color: '#8E8E93' },
};

const CATEGORY_ICONS = {
  general: 'hash',
  bill: 'credit-card',
  person: 'user',
  work: 'briefcase',
  call: 'phone',
  email: 'mail',
};

const HeaderSearch = ({ onSearch }) => {
  const [localText, setLocalText] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(localText);
    }, 500); // 500ms delay for stability
    return () => clearTimeout(timer);
  }, [localText]);

  return (
    <View style={styles.headerSearch}>
      <Ionicons name="search" size={16} color={TEXT_SECONDARY} style={{ marginRight: 8 }} />
      <TextInput
        placeholder="Search reminders..."
        placeholderTextColor={TEXT_SECONDARY}
        style={styles.headerSearchInput}
        value={localText}
        onChangeText={setLocalText}
        selectionColor={ACCENT}
        autoCorrect={false}
        spellCheck={false}
      />
      {localText ? (
        <TouchableOpacity onPress={() => setLocalText('')}>
          <Ionicons name="close-circle" size={16} color={TEXT_SECONDARY} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};


const ReminderItem = ({ item }) => {
  const router = useRouter();
  const { completeTask, deleteTask, showAlert } = useStore();

  const dueDate = new Date(item.due_at);
  const timeStr = dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = dueDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

  const isHighPriority = item.priority === 'high';
  const metaColor = CATEGORY_META[item.category]?.color || ACCENT;

  const onComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeTask(item.id);
  };

  const onDelete = () => {
    showAlert({
      title: 'Delete',
      message: 'Remove this reminder?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            deleteTask(item.id);
          }
        }
      ]
    });
  };

  return (
    <Animated.View
      entering={FadeInUp}
      exiting={FadeOut}
      layout={LinearTransition}
      style={styles.modernCard}
    >
      <TouchableOpacity
        onPress={() => router.push(`/view-reminder?id=${item.id}`)}
        activeOpacity={0.8}
        style={styles.cardTouch}
      >
        <View style={styles.topRow}>
          <View style={[styles.categoryBadge, { borderColor: metaColor + '30' }]}>
            <Feather name={CATEGORY_ICONS[item.category] || 'hash'} size={11} color={metaColor} />
            <Text style={[styles.categoryText, { color: metaColor }]}>{item.category?.toUpperCase()}</Text>
          </View>

          {item.amount > 0 && (
            <View style={styles.amountBadge}>
              <Text style={styles.amountPrefix}>{item.currency || '$'}</Text>
              <Text style={styles.amountValue}>{item.amount.toFixed(2)}</Text>
            </View>
          )}

          {isHighPriority && (
            <View style={styles.priorityBadge}>
              <MaterialCommunityIcons name="lightning-bolt" size={12} color="#FF3B30" />
            </View>
          )}
        </View>

        <Text style={styles.titleText} numberOfLines={1}>{item.title}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.infoRow}>
            <Feather name="calendar" size={12} color={TEXT_SECONDARY} style={{ marginRight: 6 }} />
            <Text style={styles.dateText}>{dateStr} • {timeStr}</Text>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={onComplete}
              style={[styles.miniActionBtn, { backgroundColor: '#34C75915', borderColor: '#34C75930' }]}
            >
              <Ionicons name="checkmark" size={14} color="#34C759" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push({ pathname: '/create-reminder', params: { editId: item.id } })}
              style={[styles.miniActionBtn, { backgroundColor: ACCENT + '15', borderColor: ACCENT + '30' }]}
            >
              <Ionicons name="pencil" size={12} color={ACCENT} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onDelete}
              style={[styles.miniActionBtn, { backgroundColor: '#FF3B3015', borderColor: '#FF3B3030' }]}
            >
              <Ionicons name="trash" size={12} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const RemindersScreen = () => {
  const { tasks, isLoading } = useStore();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }

    if (activeFilter !== 'All') {
      const f = activeFilter.toLowerCase();
      result = result.filter(t => t.category === f || t.priority === f);
    }

    return result;
  }, [tasks, searchQuery, activeFilter]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  const FilterChip = ({ label, type }) => {
    const isActive = activeFilter === label;
    return (
      <TouchableOpacity
        style={[styles.filterChip, isActive && styles.filterChipActive]}
        onPress={() => setActiveFilter(isActive ? 'All' : label)}
        activeOpacity={0.7}
      >
        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
          {label.toUpperCase()}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Tabs.Screen
        options={{
          headerTitle: () => <HeaderSearch onSearch={setSearchQuery} />,
          headerLeft: null,
          headerRight: null,
        }}
      />

      {/* Filters row only */}
      <View style={styles.headerControls}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          <FilterChip label="All" />
          <View style={styles.filterDivider} />
          <FilterChip label="High" />
          <FilterChip label="Medium" />
          <FilterChip label="Low" />
          <View style={styles.filterDivider} />
          <FilterChip label="Bill" />
          <FilterChip label="Person" />
          <FilterChip label="Work" />
          <FilterChip label="Call" />
          <FilterChip label="Email" />
        </ScrollView>
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ReminderItem item={item} />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyCircle}>
              <Ionicons name="sparkles" size={40} color={ACCENT} />
            </View>
            <Text style={styles.emptyTitle}>ALL CLEAR</Text>
            <Text style={styles.emptySubtitle}>Your schedule is wide open</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  modernCard: {
    backgroundColor: SURFACE,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cardTouch: {
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '900',
    marginLeft: 6,
    letterSpacing: 1.5,
  },
  amountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#30D15810',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30D15830',
    marginLeft: 'auto',
  },
  amountPrefix: {
    color: '#30D158',
    fontSize: 10,
    fontWeight: '800',
    marginRight: 2,
  },
  amountValue: {
    color: '#30D158',
    fontSize: 13,
    fontWeight: '900',
  },
  priorityBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B3015',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1C1C1E',
    paddingTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  miniActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    letterSpacing: 0.3,
  },
  clockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1C1C1E',
  },
  clockIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#1C1C1E',
  },
  clockDisplay: {
    flex: 1,
  },
  clockPrimary: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  clockSecondary: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    marginTop: 2,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  quickTilesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 8,
  },
  quickActionTile: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    overflow: 'hidden',
  },
  tilePart: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSeparator: {
    height: 1,
    backgroundColor: '#2C2C2E',
    marginHorizontal: 12,
  },
  tileValue: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tileUnit: {
    color: TEXT_SECONDARY,
    fontSize: 7,
    fontWeight: '800',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  expandedPanel: {
    padding: 24,
    paddingTop: 0,
  },
  nagSection: {
    marginBottom: 24,
  },
  nagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    marginLeft: 4,
  },
  nagLabel: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  nagGrid: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  nagBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  nagBtnActive: {
    backgroundColor: ACCENT,
  },
  nagText: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '800',
  },
  nagTextActive: {
    color: '#FFFFFF',
  },
  descBox: {
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1C1C1E',
  },
  descriptionText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 22,
    fontWeight: '500',
  },
  crudActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  crudBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyState: {
    marginTop: 120,
    alignItems: 'center',
  },
  emptyCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: TEXT_PRIMARY,
    letterSpacing: 4,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  headerControls: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    width: width * 0.85,
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  headerSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterChipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  filterChipText: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: BORDER,
    marginHorizontal: 4,
  },
});

export default RemindersScreen;
