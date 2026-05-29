import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function EmployeeLayout() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: signOut, style: 'destructive' }
      ]
    );
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#2ECC71' },
        headerTintColor: '#FFF',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.replace('/')} style={{ marginLeft: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen 
        name="my-schedule" 
        options={{ 
          title: 'My Schedule',
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
              <Ionicons name="log-out-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          ),
        }} 
      />
      <Stack.Screen name="file-leave" options={{ title: 'File a Leave' }} />
    </Stack>
  );
}
