import React, { useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Dimensions, 
  TouchableOpacity, Animated, Platform 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import useStore from '../src/store/useStore';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const ACCENT = '#0A84FF';
const SURFACE = '#111111';
const TEXT_PRI = '#FFFFFF';
const TEXT_SEC = '#8E8E93';

const SLIDES = [
  {
    id: '1',
    title: 'DUE\nREMINDERS',
    desc: 'The minimalist command center for your financial obligations.',
    icon: 'lightning-bolt',
    color: ACCENT,
  },
  {
    id: '2',
    title: 'NAGGING\nALERTS',
    desc: 'We won\'t let you forget. Custom intervals until you clear the due.',
    icon: 'bell-ring',
    color: '#FF375F',
  },
  {
    id: '3',
    title: 'SECURE\nBY DESIGN',
    desc: 'Your data stays on your device, protected by biometric encryption.',
    icon: 'shield-check',
    color: '#30D158',
  },
  {
    id: '4',
    title: 'CLOUD\nSYNC',
    desc: 'Go Pro to unlock cross-device sync powered by RevenueCat.',
    icon: 'cloud-upload',
    color: '#BF5AF2',
  },
];

const OnboardingScreen = () => {
  const router = useRouter();
  const completeOnboarding = useStore((state) => state.completeOnboarding);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current.scrollToIndex({ index: currentIndex + 1 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  const renderItem = ({ item }) => (
    <View style={styles.slide}>
      <View style={[styles.iconCircle, { backgroundColor: item.color + '15' }]}>
        <MaterialCommunityIcons name={item.icon} size={80} color={item.color} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.desc}>{item.desc}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        keyExtractor={(item) => item.id}
      />

      <View style={styles.footer}>
        <View style={styles.indicatorContainer}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [10, 24, 10],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View 
                key={i} 
                style={[styles.dot, { width: dotWidth, opacity, backgroundColor: ACCENT }]} 
              />
            );
          })}
        </View>

        <TouchableOpacity 
          style={[styles.button, currentIndex === SLIDES.length - 1 && styles.buttonActive]} 
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>
            {currentIndex === SLIDES.length - 1 ? "GET STARTED" : "CONTINUE"}
          </Text>
          <Ionicons 
            name={currentIndex === SLIDES.length - 1 ? "checkmark-circle" : "arrow-forward"} 
            size={20} 
            color="#FFF" 
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  slide: { width, height: height * 0.75, justifyContent: 'center', alignItems: 'center', padding: 40 },
  iconCircle: { width: 200, height: 200, borderRadius: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 60 },
  textContainer: { alignItems: 'flex-start', width: '100%' },
  title: { fontSize: 44, fontWeight: '900', color: TEXT_PRI, letterSpacing: -1, lineHeight: 48 },
  desc: { fontSize: 18, color: TEXT_SEC, marginTop: 20, lineHeight: 28, fontWeight: '500' },
  footer: { height: height * 0.25, paddingHorizontal: 40, justifyContent: 'space-between', paddingBottom: 60 },
  indicatorContainer: { flexDirection: 'row', gap: 8 },
  dot: { height: 10, borderRadius: 5 },
  button: { 
    backgroundColor: SURFACE, 
    flexDirection: 'row', 
    paddingVertical: 20, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222'
  },
  buttonActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  buttonText: { color: '#FFF', fontWeight: '900', fontSize: 16, letterSpacing: 2 },
});

export default OnboardingScreen;
