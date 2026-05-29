import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import FlatCard from './FlatCard';

export default function BiometricSettings() {
  const {
    user,
    isBiometricSupported,
    isBiometricEnrolled,
    biometricEnabled,
    enableBiometric,
    disableBiometric,
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState('');

  // If user has not verified/confirmed their email
  const isEmailConfirmed = !!(user && user.email_confirmed_at);

  const handleToggle = async (value) => {
    if (loading) return;

    if (!isEmailConfirmed) {
      Alert.alert(
        'Feature Locked',
        'Biometric login is only available for accounts with confirmed email addresses. Please verify your email first.'
      );
      return;
    }

    if (!isBiometricSupported || !isBiometricEnrolled) {
      Alert.alert(
        'Not Supported',
        'Biometrics (Fingerprint/FaceID) is either not supported or not set up on this device.'
      );
      return;
    }

    if (value) {
      // Open the cross-platform password modal
      setPassword('');
      setPasswordModalVisible(true);
    } else {
      Alert.alert(
        'Disable Biometrics',
        'Are you sure you want to turn off biometric login?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              try {
                await disableBiometric();
                Alert.alert('Disabled', 'Biometric login has been disabled.');
              } catch (err) {
                Alert.alert('Error', err.message);
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    }
  };

  const handleEnableConfirm = async () => {
    if (!password) {
      Alert.alert('Error', 'Password is required to enable biometric login.');
      return;
    }
    setPasswordModalVisible(false);
    setLoading(true);
    try {
      await enableBiometric(user.email, password);
      Alert.alert('Success', 'Biometric login has been enabled!');
    } catch (err) {
      Alert.alert('Setup Failed', err.message);
    } finally {
      setPassword('');
      setLoading(false);
    }
  };

  if (!isBiometricSupported) {
    return null; // Don't show if device has no biometric hardware
  }

  return (
    <>
      <FlatCard style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="finger-print" size={24} color="#3498DB" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Biometric Unlock</Text>
            <Text style={styles.subtitle}>
              {!isEmailConfirmed
                ? 'Confirmed email required'
                : biometricEnabled
                ? 'Enabled — tap to disable'
                : 'Sign in quickly using biometrics'}
            </Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color="#3498DB" />
          ) : (
            <Switch
              value={biometricEnabled && isEmailConfirmed}
              onValueChange={handleToggle}
              trackColor={{ false: '#BDC3C7', true: '#2ECC71' }}
              thumbColor="#FFFFFF"
              disabled={!isEmailConfirmed}
            />
          )}
        </View>
        {!isEmailConfirmed && (
          <View style={styles.lockedContainer}>
            <Ionicons name="lock-closed" size={14} color="#E74C3C" style={{ marginRight: 6 }} />
            <Text style={styles.lockedText}>
              Registered and confirmed email accounts only can unlock this feature.
            </Text>
          </View>
        )}
      </FlatCard>

      {/* Cross-platform password confirmation modal */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconRow}>
              <View style={styles.modalIconBg}>
                <Ionicons name="finger-print" size={32} color="#3498DB" />
              </View>
            </View>

            <Text style={styles.modalTitle}>Enable Biometric Login</Text>
            <Text style={styles.modalBody}>
              Enter your account password to securely enable biometric sign-in on this device.
            </Text>

            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor="#7F8C8D"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setPassword('');
                  setPasswordModalVisible(false);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.enableBtn]}
                onPress={handleEnableConfirm}
              >
                <Text style={styles.enableBtnText}>Enable</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginVertical: 10,
    backgroundColor: '#FFFFFF',
    borderColor: '#ECF0F1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  subtitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  lockedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECF0F1',
  },
  lockedText: {
    fontSize: 11,
    color: '#E74C3C',
    fontWeight: '500',
    flex: 1,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalIconRow: {
    marginBottom: 16,
  },
  modalIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 13,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  passwordInput: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#BDC3C7',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#2C3E50',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#ECF0F1',
  },
  cancelBtnText: {
    color: '#7F8C8D',
    fontWeight: 'bold',
    fontSize: 15,
  },
  enableBtn: {
    backgroundColor: '#3498DB',
  },
  enableBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
