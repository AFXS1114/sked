import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import FlatTextInput from '../components/FlatTextInput';
import FlatButton from '../components/FlatButton';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { 
    user,
    loading: authLoading,
    biometricEnabled,
    loginWithBiometrics
  } = useAuth();

  useEffect(() => {
    // Automatically trigger biometrics if it was enabled on this device AND user is not already logged in
    if (biometricEnabled && !authLoading && !user) {
      handleBiometricLogin();
    }
  }, [biometricEnabled, authLoading, user]);

  async function handleBiometricLogin() {
    try {
      await loginWithBiometrics();
    } catch (err) {
      if (err.message !== 'Biometric authentication cancelled.') {
        Alert.alert('Biometric Sign In Failed', err.message);
      }
    }
  }

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert('Login Failed', error.message);
    }
    setLoading(false);
  }

  if (authLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#3498DB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SKED</Text>
      <Text style={styles.subtitle}>Sign in to your account</Text>
      
      <View style={styles.form}>
        <FlatTextInput 
          placeholder="Email address" 
          value={email} 
          onChangeText={setEmail} 
          autoCapitalize="none" 
          keyboardType="email-address"
        />
        <FlatTextInput 
          placeholder="Password" 
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry 
        />
        <FlatButton 
          title="Sign In" 
          onPress={handleLogin} 
          color="#3498DB" 
          disabled={loading}
        />
        {biometricEnabled && (
          <FlatButton 
            title="Sign in with Biometrics" 
            onPress={handleBiometricLogin} 
            color="#2ECC71" 
            disabled={loading}
            style={{ marginTop: 4 }}
          />
        )}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ECF0F1',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 48,
  },
  form: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  }
});
