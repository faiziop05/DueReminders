import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, ActivityIndicator, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeInUp,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import useStore from '../../src/store/useStore';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const ACCENT = '#0A84FF';
const SURFACE = '#111111';
const BORDER = '#2C2C2E';
const TEXT_SECONDARY = '#8E8E93';
const TEXT_PRIMARY = '#FFFFFF';

const TimerCard = ({ item, onDelete, isPreset }) => {
  // ── Wall-clock derived remaining ─────────────────────────────────────────────
  // We NEVER store remaining in local state — we always derive it from item.end_at.
  // This means when the app wakes from background, the display is instantly correct.
  const getRemaining = () => {
    if (isPreset) return item.duration;
    if (item.end_at && item.end_at > Date.now()) {
      return Math.floor((item.end_at - Date.now()) / 1000);
    }
    // Paused: use the stored remaining field, fall back to duration
    return item.remaining ?? item.duration;
  };

  // isRunning: true only if end_at exists AND it's in the future
  const [isRunning, setIsRunning] = useState(
    !isPreset && !!item.end_at && item.end_at > Date.now()
  );
  const [isExpanded, setIsExpanded] = useState(false);
  // Dummy state only used to trigger re-renders so getRemaining() is called fresh
  const [, forceRender] = useState(0);

  // Tick every 500ms while running — triggers re-render → getRemaining() recalculates
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => forceRender(n => n + 1), 500);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Auto-stop when timer reaches 0
  const remaining = getRemaining();
  useEffect(() => {
    if (isRunning && remaining <= 0) {
      setIsRunning(false);
      if (!isPreset) {
        updateTimer(item.id, { end_at: null, remaining: 0 });
      }
    }
  }, [remaining, isRunning]);

  const { updateTimer } = useStore();

  const toggleTimer = () => {
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);

    if (isPreset) return;

    if (nextRunning) {
      // Starting: set new end_at
      const newEndAt = Date.now() + (remaining * 1000);
      updateTimer(item.id, { end_at: newEndAt, remaining: remaining });
    } else {
      // Pausing: clear end_at, save current remaining
      updateTimer(item.id, { end_at: null, remaining: remaining });
    }
  };

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;

    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: isRunning ? withTiming(ACCENT) : withTiming(BORDER),
    backgroundColor: isRunning ? withTiming('#161618') : withTiming(SURFACE),
  }));

  return (
    <Animated.View
      entering={FadeInUp}
      exiting={FadeOut}
      layout={LinearTransition}
      style={[styles.timerRow, animatedStyle]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, isRunning && styles.iconContainerActive]}>
          <Feather
            name={isRunning ? "zap" : "zap-off"}
            size={16}
            color={isRunning ? ACCENT : TEXT_SECONDARY}
          />
        </View>

        <View style={styles.labelContainer}>
          <Text
            style={styles.timerTitle}
            numberOfLines={isExpanded ? undefined : 1}
            ellipsizeMode="tail"
          >
            {item.title && item.title.trim() !== '' ? item.title : 'TIMER'}
          </Text>
        </View>

        <View style={styles.durationContainer}>
          <Text style={[styles.timerValue, isRunning && { color: ACCENT }]}>
            {formatTime(remaining)}
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity onPress={toggleTimer} style={styles.actionBtn}>
            <Ionicons
              name={isRunning ? "pause-circle" : "play-circle"}
              size={32}
              color={isRunning ? "#FF3B30" : ACCENT}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleExpand} style={styles.expandBtn}>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>
      </View>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />
          <View style={styles.expandedActions}>
            <TouchableOpacity onPress={() => setRemaining(item.duration)} style={styles.fullBtn}>
              <Feather name="rotate-ccw" size={14} color={TEXT_SECONDARY} />
              <Text style={styles.fullBtnText}>RESET TIMER</Text>
            </TouchableOpacity>

            {!isPreset && (
              <TouchableOpacity onPress={() => onDelete && onDelete(item.id)} style={[styles.fullBtn, { borderColor: '#FF3B3020' }]}>
                <Feather name="trash-2" size={14} color="#FF3B30" />
                <Text style={[styles.fullBtnText, { color: '#FF3B30' }]}>DELETE</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const TimersScreen = () => {
  const { timers, isLoading, deleteTimer } = useStore();
  const [tick, setTick] = useState(0);

  // Force a re-sort/re-render every second to keep the list updated as timers tick down
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const sortedTimers = useMemo(() => {
    return [...timers].sort((a, b) => {
      // Calculate current remaining for a
      const elapsedA = (Date.now() - a.created_at) / 1000;
      const remainingA = Math.max(0, a.duration - elapsedA);

      // Calculate current remaining for b
      const elapsedB = (Date.now() - b.created_at) / 1000;
      const remainingB = Math.max(0, b.duration - elapsedB);

      // Finished timers (remaining=0) should go to the bottom
      if (remainingA === 0 && remainingB > 0) return 1;
      if (remainingB === 0 && remainingA > 0) return -1;

      // Sort by remaining time (ascending)
      return remainingA - remainingB;
    });
  }, [timers, tick]);

  const presets = [
    { id: 'p1', title: 'Deep Work Session', duration: 3600, created_at: 0 },
    { id: 'p2', title: 'Focus Flow Routine', duration: 1500, created_at: 0 },
    { id: 'p3', title: 'Power Nap Break', duration: 1200, created_at: 0 },
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sortedTimers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>MY LIVE TIMERS</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{sortedTimers.length}</Text>
              </View>
            </View>
            {sortedTimers.map(timer => (
              <TimerCard key={timer.id} item={timer} onDelete={deleteTimer} isPreset={false} />
            ))}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>PRESETS</Text>
          </View>
          {presets.map(timer => (
            <TimerCard key={timer.id} item={timer} isPreset={true} />
          ))}
        </View>

        {timers.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="timer-sand-empty" size={32} color="#222" />
            <Text style={styles.emptyText}>Create a custom 24h timer to start</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loadingContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 120 },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10, paddingLeft: 4 },
  sectionTitle: { fontSize: 10, fontWeight: '900', color: TEXT_SECONDARY, letterSpacing: 2 },
  countBadge: { backgroundColor: ACCENT + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  countText: { color: ACCENT, fontSize: 9, fontWeight: '900' },
  timerRow: {
    backgroundColor: SURFACE,
    borderRadius: 24,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#1C1C1E' },
  iconContainerActive: { borderColor: ACCENT + '30' },
  labelContainer: { flex: 1, marginRight: 8 },
  timerTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  durationContainer: { marginRight: 12, minWidth: 60, alignItems: 'flex-end' },
  timerValue: { fontSize: 18, fontWeight: '900', color: TEXT_SECONDARY, fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  actionsContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtn: { justifyContent: 'center', alignItems: 'center' },
  expandBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#1C1C1E' },
  expandedContent: { marginTop: 12 },
  divider: { height: 1, backgroundColor: '#1C1C1E', marginBottom: 12 },
  expandedActions: { flexDirection: 'row', gap: 10 },
  fullBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#000', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#1C1C1E' },
  fullBtnText: { fontSize: 10, fontWeight: '900', color: TEXT_SECONDARY, letterSpacing: 1 },
  emptyState: { alignItems: 'center', marginTop: 40, opacity: 0.3 },
  emptyText: { color: TEXT_SECONDARY, fontSize: 11, fontWeight: '600', marginTop: 12 },
});

export default TimersScreen;
