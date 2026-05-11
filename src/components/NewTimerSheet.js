import React, { forwardRef, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import useStore from '../store/useStore';

const NewTimerSheet = forwardRef((props, ref) => {
  const snapPoints = useMemo(() => ['50%', '80%'], []);
  const addTimer = useStore((state) => state.addTimer);

  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('15');

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;

    await addTimer({
      title,
      duration: parseInt(duration) * 60,
    });

    setTitle('');
    setDuration('15');
    ref.current?.dismiss();
    Keyboard.dismiss();
  }, [title, duration, addTimer, ref]);

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      backgroundStyle={styles.sheetBackground}
    >
      <BottomSheetView style={styles.contentContainer}>
        <Text style={styles.header}>New Quick Timer</Text>
        
        <BottomSheetTextInput
          style={styles.mainInput}
          placeholder="What's it for?"
          placeholderTextColor="#757575"
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Duration (Minutes)</Text>
          <BottomSheetTextInput
            style={styles.durationInput}
            keyboardType="numeric"
            value={duration}
            onChangeText={setDuration}
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, !title.trim() && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={!title.trim()}
        >
          <Text style={styles.saveButtonText}>Save Timer</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
  },
  contentContainer: {
    padding: 24,
    flex: 1,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1B1F',
    marginBottom: 32,
  },
  mainInput: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1C1B1F',
    marginBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
  },
  inputGroup: {
    marginBottom: 40,
  },
  label: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 12,
  },
  durationInput: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6200EE',
    padding: 0,
  },
  saveButton: {
    backgroundColor: '#6200EE',
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
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

export default NewTimerSheet;
