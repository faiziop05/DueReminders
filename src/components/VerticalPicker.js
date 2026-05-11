import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const ITEM_HEIGHT = 60;

const VerticalPicker = ({ items = [], data, selectedValue, onValueChange, label, width }) => {
  const scrollViewRef = useRef(null);
  const isUserScrolling = useRef(false);
  const lastUpdateValue = useRef(null); // Initialize to null to force first scroll
  
  const sourceData = items.length > 0 ? items : (data || []);
  const extendedData = ['', ...sourceData, ''];

  const handleScrollBegin = () => {
    isUserScrolling.current = true;
  };

  const handleScrollEnd = (event) => {
    isUserScrolling.current = false;
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const value = sourceData[index];
    
    if (value !== undefined && value !== selectedValue) {
      lastUpdateValue.current = value;
      onValueChange(value);
    }
  };

  useEffect(() => {
    // Scroll whenever selectedValue changes OR on mount if not already there
    if (!isUserScrolling.current && selectedValue !== lastUpdateValue.current) {
      const index = sourceData.indexOf(selectedValue);
      if (index !== -1) {
        const timer = setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: index * ITEM_HEIGHT,
            animated: true,
          });
        }, 100); // Increased timeout for better stability
        return () => clearTimeout(timer);
      }
    }
    lastUpdateValue.current = selectedValue;
  }, [selectedValue, sourceData]);

  return (
    <View style={[styles.container, width ? { width, flex: 0 } : {}]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.pickerWindow}>
        <View style={styles.selectionCapsule} />
        
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast" 
          scrollEventThrottle={16}
          onScrollBeginDrag={handleScrollBegin}
          onMomentumScrollBegin={handleScrollBegin}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          nestedScrollEnabled={true}
          overScrollMode="never"
        >
          {extendedData.map((item, index) => {
            const isSelected = item === selectedValue;
            return (
              <View 
                key={`item-${index}`} 
                style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}
                pointerEvents="none"
              >
                <Text style={[
                  styles.itemText, 
                  isSelected ? styles.itemTextSelected : styles.itemTextUnselected
                ]}>
                  {item}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: 10,
    color: '#8E8E93',
    marginBottom: 12,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 2,
  },
  pickerWindow: {
    height: ITEM_HEIGHT * 3,
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  selectionCapsule: {
    position: 'absolute',
    top: ITEM_HEIGHT + 8,
    bottom: ITEM_HEIGHT + 8,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
  },
  itemText: {
    fontSize: 18,
    fontWeight: '600',
  },
  itemTextSelected: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  itemTextUnselected: {
    color: '#FFFFFF',
    opacity: 0.2,
  },
});

export default VerticalPicker;
