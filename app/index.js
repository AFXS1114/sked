import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import FlatButton from '../components/FlatButton';

export default function RoleSelectionScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SKED</Text>
      <Text style={styles.subtitle}>Select Your Role{"\n"} Development Phase</Text>

      <FlatButton
        title="Admin"
        onPress={() => router.push('/(admin)/employees')}
        color="#E74C3C"
      />
      <FlatButton
        title="Manager"
        onPress={() => router.push('/(manager)/duty-board')}
        color="#3498DB"
      />
      <FlatButton
        title="Employee"
        onPress={() => router.push('/(employee)/my-schedule')}
        color="#2ECC71"
      />
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
});
