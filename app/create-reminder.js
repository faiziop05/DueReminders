import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
  InteractionManager,
  Dimensions,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');
import { Ionicons } from '@expo/vector-icons';
import useStore from '../src/store/useStore';
import VerticalPicker from '../src/components/VerticalPicker';

import * as Haptics from 'expo-haptics';

const ACCENT = '#0A84FF';
const SURFACE = '#1C1C1E';
const BORDER = '#38383A';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#A1A1A6';

const ALL_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const PERIODS = ['AM', 'PM'];

const CATEGORIES = [
  { id: 'general', label: 'GENERAL', icon: 'list' },
  { id: 'bill', label: 'BILL', icon: 'card' },
  { id: 'person', label: 'PERSON', icon: 'person' },
  { id: 'work', label: 'WORK', icon: 'briefcase' },
  { id: 'call', label: 'CALL', icon: 'call' },
  { id: 'email', label: 'EMAIL', icon: 'mail' },
];

const NAG_INTERVALS = [
  { label: 'None', value: 0 },
  { label: '1m', value: 1 },
  { label: '5m', value: 5 },
  { label: '15m', value: 15 },
  { label: '1h', value: 60 },
];

const PRIORITIES = [
  { id: 'low', label: 'LOW' },
  { id: 'medium', label: 'MEDIUM' },
  { id: 'high', label: 'HIGH' },
];

const CURRENCIES = [
  { symbol: '$', code: 'USD' },
  { symbol: '€', code: 'EUR' },
  { symbol: '£', code: 'GBP' },
  { symbol: '₹', code: 'INR' },
  { symbol: '¥', code: 'JPY' },
  { symbol: '₩', code: 'KRW' },
  { symbol: 'Rs', code: 'PKR' },
  { symbol: 'A$', code: 'AUD' },
  { symbol: 'C$', code: 'CAD' },
  { symbol: '₿', code: 'BTC' },
];

const CreateReminderScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isReady, setIsReady] = useState(false);

  // Optimized Selectors
  const tasks = useStore(state => state.tasks);
  const completedTasks = useStore(state => state.completedTasks);
  const addTask = useStore(state => state.addTask);
  const updateTask = useStore(state => state.updateTask);
  const showAlert = useStore(state => state.showAlert);

  const isEditing = !!params.editId;
  const editTask = useMemo(() => {
    if (!isEditing) return null;
    const tid = parseInt(params.editId);
    return tasks.find(t => t.id === tid) || completedTasks.find(t => t.id === tid);
  }, [params.editId, isEditing, tasks, completedTasks]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('$');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [nagInterval, setNagInterval] = useState(5);

  // Time State
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(ALL_MONTHS[new Date().getMonth()]);
  const [selectedDate, setSelectedDate] = useState(new Date().getDate().toString().padStart(2, '0'));
  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState('AM');

  // Sync state with editTask
  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title || '');
      setDescription(editTask.description || '');
      setAmount(editTask.amount ? editTask.amount.toString() : '');
      setCurrency(editTask.currency || '$');
      setCategory(editTask.category || 'general');
      setPriority(editTask.priority || 'medium');
      setNagInterval(editTask.nag_interval || 0);

      const date = new Date(editTask.due_at);
      setSelectedYear(date.getFullYear().toString());
      setSelectedMonth(ALL_MONTHS[date.getMonth()]);
      setSelectedDate(date.getDate().toString().padStart(2, '0'));

      const h = date.getHours();
      setSelectedHour(((h % 12) || 12).toString().padStart(2, '0'));
      setSelectedMinute(date.getMinutes().toString().padStart(2, '0'));
      setSelectedPeriod(h >= 12 ? 'PM' : 'AM');
    } else {
      // Default for new reminder
      const nextHour = new Date(Date.now() + 3600000);
      const h = nextHour.getHours();
      setSelectedYear(nextHour.getFullYear().toString());
      setSelectedMonth(ALL_MONTHS[nextHour.getMonth()]);
      setSelectedDate(nextHour.getDate().toString().padStart(2, '0'));
      setSelectedHour(((h % 12) || 12).toString().padStart(2, '0'));
      setSelectedMinute('00');
      setSelectedPeriod(h >= 12 ? 'PM' : 'AM');
    }
  }, [editTask]);

  useEffect(() => {
    // Delay heavy rendering until transition is done
    const task = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
    return () => task.cancel();
  }, []);

  // Picker Data
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 10 }, (_, i) => (currentYear + i).toString()), [currentYear]);
  const months = ALL_MONTHS;
  const days = useMemo(() => {
    const monthIndex = ALL_MONTHS.indexOf(selectedMonth);
    const lastDay = new Date(parseInt(selectedYear), monthIndex + 1, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => (i + 1).toString().padStart(2, '0'));
  }, [selectedYear, selectedMonth]);

  const hoursList = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutesList = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const monthIndex = ALL_MONTHS.indexOf(selectedMonth);
    let hour24 = parseInt(selectedHour);
    if (selectedPeriod === 'PM' && hour24 < 12) hour24 += 12;
    if (selectedPeriod === 'AM' && hour24 === 12) hour24 = 0;

    const dueAt = new Date(parseInt(selectedYear), monthIndex, parseInt(selectedDate), hour24, parseInt(selectedMinute)).getTime();

    if (dueAt <= Date.now() && !isEditing) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showAlert({
        title: 'Invalid Time',
        message: 'Please select a time in the future.',
      });
      return;
    }

    const taskData = {
      title,
      description,
      amount: parseFloat(amount) || 0,
      currency,
      due_at: dueAt,
      nag_interval: nagInterval,
      category,
      priority,
      status: 'pending', // Restore to pending if editing from history
    };

    try {
      if (isEditing) {
        await updateTask(parseInt(params.editId), taskData);
      } else {
        await addTask(taskData);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error(e);
    }
  }, [title, description, selectedYear, selectedMonth, selectedDate, selectedHour, selectedMinute, selectedPeriod, nagInterval, category, priority, isEditing, params.editId, addTask, updateTask, router]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <Stack.Screen options={{
        headerShown: true,
        title: isEditing ? 'EDIT REMINDER' : 'NEW REMINDER',
        headerStyle: { backgroundColor: '#000000', borderBottomWidth: 0 },
        headerTitleStyle: { color: TEXT_PRIMARY, fontWeight: '900', fontSize: 13, letterSpacing: 4 },
        headerTintColor: ACCENT,
        headerShadowVisible: false,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
            <Ionicons name="chevron-back" size={28} color={ACCENT} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity onPress={handleSave} disabled={!title.trim()}>
            <Text style={[styles.headerSave, !title.trim() && { color: TEXT_SECONDARY, opacity: 0.3 }]}>DONE</Text>
          </TouchableOpacity>
        )
      }} />

      {!isReady ? (
        <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
          {/* Empty black view or light loader during transition */}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputSection}>
            <TextInput
              style={styles.mainInput}
              placeholder="I need to..."
              placeholderTextColor="#78787aff"
              value={title}
              onChangeText={setTitle}
              color={TEXT_PRIMARY}
              maxLength={100}
            />
            <TextInput
              style={styles.descInput}
              placeholder="Add context or notes"
              placeholderTextColor="#48484aff"
              value={description}
              onChangeText={setDescription}
              multiline
              color={TEXT_SECONDARY}
            />
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Due Amount (Optional)</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>{currency}</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#48484aff"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                color={TEXT_PRIMARY}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.currencyScroll}
              contentContainerStyle={{ paddingHorizontal: 24 }}
            >
              {CURRENCIES.map(cur => (
                <TouchableOpacity
                  key={cur.code}
                  style={[styles.currencyBtn, currency === cur.symbol && styles.currencyBtnActive]}
                  onPress={() => setCurrency(cur.symbol)}
                >
                  <Text style={[styles.currencyBtnText, currency === cur.symbol && styles.currencyBtnTextActive]}>
                    {cur.symbol} <Text style={{ fontSize: 8 }}>{cur.code}</Text>
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
              contentContainerStyle={{ paddingHorizontal: 24 }}
            >
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryCard, category === cat.id && styles.categoryCardSelected]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Ionicons name={cat.icon} size={20} color={category === cat.id ? '#FFFFFF' : ACCENT} />
                  <Text style={[styles.categoryLabel, category === cat.id && styles.categoryLabelSelected]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.rowContainer}>
            <View style={styles.flex1}>
              <Text style={[styles.sectionTitle, { marginLeft: 0 }]}>Priority</Text>
              <View style={styles.segmentedControl}>
                {PRIORITIES.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.segment, priority === p.id && styles.segmentActive]}
                    onPress={() => setPriority(p.id)}
                  >
                    <Text style={[styles.segmentText, priority === p.id && styles.segmentTextActive]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.rowContainer}>
            <View style={styles.flex1}>
              <Text style={[styles.sectionTitle, { marginLeft: 0 }]}>Nagging</Text>
              <View style={styles.segmentedControl}>
                {NAG_INTERVALS.map(nag => (
                  <TouchableOpacity
                    key={nag.value}
                    style={[styles.segment, nagInterval === nag.value && styles.segmentActive]}
                    onPress={() => setNagInterval(nag.value)}
                  >
                    <Text style={[styles.segmentText, nagInterval === nag.value && styles.segmentTextActive]}>{nag.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Schedule View */}
          <View style={styles.sectionContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.sectionTitle}>Due Date</Text>
              <Text style={styles.liveValueText}>{selectedDate} {selectedMonth} {selectedYear}</Text>
            </View>
            <View style={styles.pickerCard}>
              <View style={styles.pickerRow}>
                <VerticalPicker items={years} selectedValue={selectedYear} onValueChange={setSelectedYear} />
                <VerticalPicker items={months} selectedValue={selectedMonth} onValueChange={setSelectedMonth} />
                <VerticalPicker items={days} selectedValue={selectedDate} onValueChange={setSelectedDate} />
              </View>
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.sectionTitle}>Due Time</Text>
              <Text style={styles.liveValueText}>{selectedHour}:{selectedMinute} {selectedPeriod}</Text>
            </View>
            <View style={styles.pickerCard}>
              <View style={styles.pickerRow}>
                <VerticalPicker items={hoursList} selectedValue={selectedHour} onValueChange={setSelectedHour} />
                <VerticalPicker items={minutesList} selectedValue={selectedMinute} onValueChange={setSelectedMinute} />
                <VerticalPicker items={PERIODS} selectedValue={selectedPeriod} onValueChange={setSelectedPeriod} />
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  headerSave: { fontSize: 13, fontWeight: '900', color: ACCENT, marginRight: 16, letterSpacing: 2 },
  content: { paddingVertical: 16, paddingBottom: 60 },
  inputSection: { paddingHorizontal: 24, marginBottom: 32 },
  mainInput: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginBottom: 8, color: TEXT_PRIMARY },
  descInput: { fontSize: 16, fontWeight: '500', color: TEXT_SECONDARY, minHeight: 40 },
  sectionContainer: { marginBottom: 32 },
  sectionTitle: { fontSize: 10, fontWeight: '900', color: ACCENT, textTransform: 'uppercase', marginBottom: 16, marginLeft: 24, letterSpacing: 2.5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveValueText: { fontSize: 11, fontWeight: '700', color: ACCENT, marginBottom: 12, marginRight: 24 },
  horizontalScroll: { width: width },
  categoryCard: { backgroundColor: SURFACE, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, marginRight: 12, alignItems: 'center', flexDirection: 'row', borderWidth: 1, borderColor: BORDER },
  categoryCardSelected: { backgroundColor: ACCENT, borderColor: ACCENT },
  categoryLabel: { color: TEXT_PRIMARY, fontSize: 12, fontWeight: '700', marginLeft: 8 },
  categoryLabelSelected: { color: '#FFFFFF' },
  rowContainer: { flexDirection: 'row', marginBottom: 32, paddingHorizontal: 24 },
  flex1: { flex: 1 },
  segmentedControl: { flexDirection: 'row', backgroundColor: SURFACE, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: BORDER },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
  segmentActive: { backgroundColor: '#3A3A3C' },
  segmentText: { color: TEXT_SECONDARY, fontSize: 10, fontWeight: '800' },
  segmentTextActive: { color: TEXT_PRIMARY },
  pickerCard: { backgroundColor: SURFACE, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: BORDER, marginHorizontal: 24 },
  pickerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: BORDER,
    marginHorizontal: 24,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: ACCENT,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  currencyScroll: {
    marginTop: 12,
    width: width,
  },
  currencyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: SURFACE,
    marginRight: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  currencyBtnActive: {
    backgroundColor: ACCENT + '20',
    borderColor: ACCENT,
  },
  currencyBtnText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '800',
  },
  currencyBtnTextActive: {
    color: ACCENT,
  },
});

export default CreateReminderScreen;
