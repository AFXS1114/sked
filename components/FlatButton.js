import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function FlatButton({ title, onPress, color = '#3498DB', style, textStyle, disabled }) {
  return (
    <TouchableOpacity 
      style={[styles.button, { backgroundColor: disabled ? '#BDC3C7' : color }, style]} 
      onPress={onPress} 
      activeOpacity={0.8}
      disabled={disabled}
    >
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  text: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
