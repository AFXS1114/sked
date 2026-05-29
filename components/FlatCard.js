import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function FlatCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ECF0F1',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BDC3C7',
    // No shadows, flat design
  },
});
