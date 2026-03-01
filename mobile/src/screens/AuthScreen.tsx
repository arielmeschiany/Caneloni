import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Auth'>;
};

export function AuthScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'sign-in') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigation.goBack();
      } else {
        const { error } = await signUp(email, password);
        if (error) throw error;
        Alert.alert(
          'Account Created',
          'Check your email to confirm your account, then sign in.',
          [{ text: 'OK', onPress: () => setMode('sign-in') }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>🏛️ Canaloni</Text>
          <Text style={styles.subtitle}>
            {mode === 'sign-in' ? 'Welcome back!' : 'Join the community'}
          </Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#3D2B1F55"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#3D2B1F55"
              secureTextEntry
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.submitBtnText}>
              {loading ? 'Please wait…' : mode === 'sign-in' ? 'Sign In' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
            style={styles.switchMode}
          >
            <Text style={styles.switchModeText}>
              {mode === 'sign-in' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.switchModeLink}>
                {mode === 'sign-in' ? 'Sign up' : 'Sign in'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.skipBtn}>
          <Text style={styles.skipText}>Continue without signing in →</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  scroll: { flexGrow: 1, paddingHorizontal: 20 },
  header: { alignItems: 'center', marginBottom: 32 },
  appName: { fontSize: 32, fontWeight: '700', color: '#3D2B1F', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#3D2B1F99', marginTop: 6 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#3D2B1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    gap: 16,
  },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#3D2B1F' },
  input: {
    borderWidth: 1.5,
    borderColor: '#3D2B1F22',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#3D2B1F',
    backgroundColor: '#FAFAF8',
  },
  submitBtn: {
    backgroundColor: '#C4622D',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  switchMode: { alignItems: 'center' },
  switchModeText: { fontSize: 13, color: '#3D2B1F88' },
  switchModeLink: { color: '#C4622D', fontWeight: '600' },
  skipBtn: { alignItems: 'center', marginTop: 20 },
  skipText: { color: '#3D2B1F66', fontSize: 13 },
});
