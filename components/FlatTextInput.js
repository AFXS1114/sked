import React from 'react';
import { TextInput, StyleSheet } from 'react-native';

export default function FlatTextInput({ style, ...props }) {
  return (
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor="#7F8C8D"
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BDC3C7',
    marginVertical: 8,
    color: '#2C3E50',
    fontSize: 16,
  },
});
