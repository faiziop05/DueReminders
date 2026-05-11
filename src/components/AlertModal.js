import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../store/useStore';

const { width } = Dimensions.get('window');

const ACCENT = '#0A84FF';
const RED    = '#FF453A';
const SURFACE = '#1C1C1E';
const BORDER = '#2C2C2E';
const TEXT_PRI = '#FFFFFF';
const TEXT_SEC = '#8E8E93';

const AlertModal = () => {
  const { alertConfig, hideAlert } = useStore();

  if (!alertConfig) return null;

  const { title, message, buttons } = alertConfig;

  const handlePress = (onPress) => {
    hideAlert();
    if (onPress) onPress();
  };

  return (
    <Modal
      transparent
      visible={!!alertConfig}
      animationType="fade"
      onRequestClose={hideAlert}
    >
      <Pressable style={styles.overlay} onPress={hideAlert}>
        {/* Simple high-contrast dimmed background instead of blur */}
        <View style={styles.backdrop} />
        
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="notifications" size={24} color={ACCENT} />
            </View>
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>

          <View style={styles.buttonContainer}>
            {buttons && buttons.length > 0 ? (
              buttons.map((btn, idx) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.button,
                      idx > 0 && styles.buttonBorder,
                    ]}
                    onPress={() => handlePress(btn.onPress)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.buttonText,
                      isDestructive && { color: RED },
                      isCancel && { color: TEXT_SEC }
                    ]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <TouchableOpacity style={styles.button} onPress={hideAlert}>
                <Text style={styles.buttonText}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Deep opacity for premium feel
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: SURFACE,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.58,
    shadowRadius: 16,
  },
  header: {
    padding: 32,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: TEXT_PRI,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 16,
    color: TEXT_SEC,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
    fontWeight: '500',
  },
  buttonContainer: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: SURFACE,
  },
  button: {
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonBorder: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: ACCENT,
  },
});

export default AlertModal;
