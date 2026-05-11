import React, { forwardRef, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import VerticalPicker from './VerticalPicker';
import useStore from '../store/useStore';

const YEARS = ['2026', '2027', '2028', '2029', '2030'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const DATES = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

const NewReminderSheet = forwardRef((props, ref) => {
  const snapPoints = useMemo(() => ['70%', '95%'], []);
  const addTask = useStore((state) => state.addTask);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[now.getMonth()]);
  const [selectedDate, setSelectedDate] = useState((now.getDate()).toString().padStart(2, '0'));
  const [selectedHour, setSelectedHour] = useState(now.getHours().toString().padStart(2, '0'));
  const [selectedMinute, setSelectedMinute] = useState(now.getMinutes().toString().padStart(2, '0'));

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;

    const monthIndex = MONTHS.indexOf(selectedMonth);
    const dueAt = new Date(
      parseInt(selectedYear),
      monthIndex,
      parseInt(selectedDate),
      parseInt(selectedHour),
      parseInt(selectedMinute)
    ).getTime();

    await addTask({
      title,
      description,
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
      due_at: dueAt,
      nag_interval: 5,
    });

    // Reset and close
    setTitle('');
    setDescription('');
    setTags('');
    ref.current?.dismiss();
    Keyboard.dismiss();
  }, [title, description, tags, selectedYear, selectedMonth, selectedDate, selectedHour, selectedMinute, addTask, ref]);

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.indicator}
    >
      <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.header}>New Reminder</Text>
        
        <BottomSheetTextInput
          style={styles.mainInput}
          placeholder="Title"
          placeholderTextColor="#757575"
          value={title}
          onChangeText={setTitle}
        />

        <BottomSheetTextInput
          style={styles.descInput}
          placeholder="Description"
          placeholderTextColor="#BDBDBD"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <BottomSheetTextInput
          style={styles.tagInput}
          placeholder="Tags (comma separated)"
          placeholderTextColor="#BDBDBD"
          value={tags}
          onChangeText={setTags}
        />

        <Text style={styles.sectionLabel}>Due At</Text>
        <View style={styles.pickerRow}>
          <VerticalPicker label="Year" data={YEARS} selectedValue={selectedYear} onValueChange={setSelectedYear} />
          <VerticalPicker label="Mon" data={MONTHS} selectedValue={selectedMonth} onValueChange={setSelectedMonth} />
          <VerticalPicker label="Day" data={DATES} selectedValue={selectedDate} onValueChange={setSelectedDate} />
          <VerticalPicker label="Hr" data={HOURS} selectedValue={selectedHour} onValueChange={setSelectedHour} />
          <VerticalPicker label="Min" data={MINUTES} selectedValue={selectedMinute} onValueChange={setSelectedMinute} />
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, !title.trim() && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={!title.trim()}
        >
          <Text style={styles.saveButtonText}>Create Reminder</Text>
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
  },
  indicator: {
    backgroundColor: '#E0E0E0',
    width: 40,
  },
  contentContainer: {
    padding: 24,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1B1F',
    marginBottom: 24,
  },
  mainInput: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1C1B1F',
    marginBottom: 16,
    padding: 0,
  },
  descInput: {
    fontSize: 16,
    color: '#49454F',
    marginBottom: 16,
    padding: 0,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  tagInput: {
    fontSize: 14,
    color: '#6200EE',
    marginBottom: 32,
    padding: 0,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#757575',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F9',
    borderRadius: 24,
    padding: 12,
    marginBottom: 32,
  },
  saveButton: {
    backgroundColor: '#6200EE',
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default NewReminderSheet;
