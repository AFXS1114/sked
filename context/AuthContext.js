import React, { createContext, useState, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  // Biometric authentication states
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    checkBiometricHardware();
  }, [user]);

  async function checkBiometricHardware() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricSupported(hasHardware);
      setIsBiometricEnrolled(isEnrolled);

      if (user) {
        const enabled = await AsyncStorage.getItem(`sked_biometric_enabled_${user.id}`);
        setBiometricEnabled(enabled === 'true');
      } else {
        // When not logged in, check if any account has biometric login enabled
        const globalEnabled = await AsyncStorage.getItem('sked_biometric_enabled_global');
        setBiometricEnabled(globalEnabled === 'true');
      }
    } catch (e) {
      console.log('[Biometric] Hardware check failed:', e);
    }
  }

  async function enableBiometric(email, password) {
    if (!user) throw new Error('You must be signed in to configure biometric authentication.');
    
    // STRICT RULE: registered and confirmed email only can unlock this feature!
    if (!user.email_confirmed_at) {
      throw new Error('Your email address must be confirmed before enabling biometric login. Please confirm your email first.');
    }

    if (!isBiometricSupported || !isBiometricEnrolled) {
      throw new Error('Biometric authentication is not supported or set up on this device.');
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirm fingerprint or face recognition to enable',
      fallbackLabel: 'Use Passcode',
    });

    if (result.success) {
      // Securely store credentials associated with this user
      await SecureStore.setItemAsync(`sked_biometric_email`, email);
      await SecureStore.setItemAsync(`sked_biometric_password`, password);
      await AsyncStorage.setItem(`sked_biometric_enabled_${user.id}`, 'true');
      await AsyncStorage.setItem('sked_biometric_enabled_global', 'true');
      await AsyncStorage.setItem('sked_biometric_user_id', user.id);
      setBiometricEnabled(true);
      return true;
    } else {
      throw new Error('Biometric verification failed.');
    }
  }

  async function disableBiometric() {
    if (user) {
      await AsyncStorage.setItem(`sked_biometric_enabled_${user.id}`, 'false');
    }
    await AsyncStorage.setItem('sked_biometric_enabled_global', 'false');
    await SecureStore.deleteItemAsync(`sked_biometric_email`);
    await SecureStore.deleteItemAsync(`sked_biometric_password`);
    setBiometricEnabled(false);
  }

  async function loginWithBiometrics() {
    const globalEnabled = await AsyncStorage.getItem('sked_biometric_enabled_global');
    if (globalEnabled !== 'true') {
      throw new Error('Biometric login is not enabled on this device.');
    }

    const email = await SecureStore.getItemAsync(`sked_biometric_email`);
    const password = await SecureStore.getItemAsync(`sked_biometric_password`);

    if (!email || !password) {
      throw new Error('Biometric credentials expired or missing. Please log in with password to re-enable.');
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to sign in to SKED',
      fallbackLabel: 'Use Password',
    });

    if (result.success) {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        throw error;
      }
      return data;
    } else {
      throw new Error('Biometric authentication cancelled.');
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] Initial session:', session?.user?.email ?? 'none');
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[Auth] State changed:', _event, session?.user?.email ?? 'none');
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    console.log('[Auth] Fetching profile for auth_id:', userId);
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('auth_id', userId)
      .single();

    if (error) {
      console.log('[Auth] Profile fetch error:', error.message);
      // Try matching by email as fallback
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.email) {
        console.log('[Auth] Trying email fallback:', authUser.email);
        const { data: emailData, error: emailErr } = await supabase
          .from('employees')
          .select('*')
          .eq('email', authUser.email)
          .single();
        
        if (!emailErr && emailData) {
          // Link the auth_id for future logins
          await supabase.from('employees')
            .update({ auth_id: userId })
            .eq('id', emailData.id);
          setProfile(emailData);
          setLoading(false);
          return;
        }
      }
      
      Alert.alert(
        'Account Not Linked',
        'Your login was successful but no employee profile is linked to this account. Please ask an Admin to link your auth_id in the employees table.',
        [{ text: 'OK', onPress: () => supabase.auth.signOut() }]
      );
    } else if (data) {
      console.log('[Auth] Profile found:', data.full_name, 'role:', data.role);
      setProfile(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    // Wait for navigation to be ready
    if (!navigationState?.key) return;
    if (loading) return;

    const currentRoute = segments[0] || '';
    console.log('[Auth] Route guard check - user:', !!user, 'profile:', profile?.role, 'route:', currentRoute);

    if (!user) {
      // Not logged in — only allow the login screen (index)
      if (currentRoute !== '') {
        router.replace('/');
      }
    } else if (user && profile) {
      // Logged in with a linked profile — redirect based on role
      if (currentRoute === '' || currentRoute === '(auth)') {
        if (profile.role === 'admin') {
          router.replace('/(admin)/employees');
        } else if (profile.role === 'manager') {
          router.replace('/(manager)/duty-board');
        } else {
          router.replace('/(employee)/my-schedule');
        }
      } else {
        // Enforce route protection
        if (currentRoute === '(admin)' && profile.role !== 'admin') {
          router.replace('/');
        }
        if (currentRoute === '(manager)' && profile.role !== 'manager' && profile.role !== 'admin') {
          router.replace('/');
        }
      }
    }
  }, [user, profile, loading, segments, navigationState?.key]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signOut: () => supabase.auth.signOut(),
      isBiometricSupported,
      isBiometricEnrolled,
      biometricEnabled,
      enableBiometric,
      disableBiometric,
      loginWithBiometrics
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
