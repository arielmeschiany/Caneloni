import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { Location, Review } from '@canaloni/shared';
import { formatDate } from '@canaloni/shared';
import type { TabParamList } from '@/navigation/AppNavigator';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { CategoryBadge } from '@/components/CategoryBadge';
import { StarRating } from '@/components/StarRating';

type Props = {
  navigation: BottomTabNavigationProp<TabParamList, 'Profile'>;
};

export function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading, signOut } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      const [locRes, revRes] = await Promise.all([
        supabase.from('locations').select('*').eq('created_by', user.id).order('created_at', { ascending: false }),
        supabase.from('reviews').select('*, locations(name, category)').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      setLocations((locRes.data as Location[]) ?? []);
      setReviews(revRes.data ?? []);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (authLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#C4622D" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.bigEmoji}>🏛️</Text>
        <Text style={styles.signInTitle}>Join Canaloni</Text>
        <Text style={styles.signInSubtitle}>Sign in to pin locations and write reviews.</Text>
        <TouchableOpacity
          style={styles.signInBtn}
          onPress={() => (navigation as any).navigate('Auth')}
          activeOpacity={0.8}
        >
          <Text style={styles.signInBtnText}>Sign In / Sign Up</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      >
        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.email?.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.email?.split('@')[0]}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={styles.statsRow}>
              <Text style={styles.stat}>{locations.length} pins</Text>
              <Text style={styles.statDot}>•</Text>
              <Text style={styles.stat}>{reviews.length} reviews</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#C4622D" style={{ marginTop: 32 }} />
        ) : (
          <>
            {/* Pinned Locations */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📍 My Pinned Locations</Text>
              {locations.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyEmoji}>🗺️</Text>
                  <Text style={styles.emptyText}>No locations pinned yet.</Text>
                </View>
              ) : (
                locations.map(loc => (
                  <View key={loc.id} style={styles.card}>
                    <CategoryBadge category={loc.category} size="sm" />
                    <Text style={styles.cardTitle}>{loc.name}</Text>
                    {loc.description ? (
                      <Text style={styles.cardDescription} numberOfLines={2}>{loc.description}</Text>
                    ) : null}
                    <Text style={styles.cardDate}>{formatDate(loc.created_at)}</Text>
                  </View>
                ))
              )}
            </View>

            {/* Reviews */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⭐ My Reviews</Text>
              {reviews.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyEmoji}>✍️</Text>
                  <Text style={styles.emptyText}>No reviews written yet.</Text>
                </View>
              ) : (
                reviews.map((rev: any) => (
                  <View key={rev.id} style={styles.card}>
                    {rev.locations && <CategoryBadge category={rev.locations.category} size="sm" />}
                    <Text style={styles.cardTitle}>{rev.locations?.name ?? 'Unknown location'}</Text>
                    <StarRating rating={rev.rating} size={14} />
                    {rev.comment && <Text style={styles.cardDescription}>{rev.comment}</Text>}
                    <Text style={styles.cardDate}>{formatDate(rev.created_at)}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F5F0E8' },
  bigEmoji: { fontSize: 56, marginBottom: 16 },
  signInTitle: { fontSize: 24, fontWeight: '800', color: '#3D2B1F', marginBottom: 8 },
  signInSubtitle: { fontSize: 14, color: '#3D2B1F88', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  signInBtn: {
    backgroundColor: '#C4622D',
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  signInBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DDD0',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#3D2B1F' },
  signOutText: { fontSize: 13, color: '#3D2B1F66' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#3D2B1F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#C4622D22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#C4622D' },
  userInfo: { flex: 1, gap: 2 },
  userName: { fontSize: 16, fontWeight: '700', color: '#3D2B1F' },
  userEmail: { fontSize: 12, color: '#3D2B1F66' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  stat: { fontSize: 12, color: '#3D2B1F88', fontWeight: '500' },
  statDot: { fontSize: 12, color: '#3D2B1F44' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#3D2B1F' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    gap: 6,
    shadowColor: '#3D2B1F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#3D2B1F' },
  cardDescription: { fontSize: 13, color: '#3D2B1F88', lineHeight: 18 },
  cardDate: { fontSize: 11, color: '#3D2B1F44' },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyEmoji: { fontSize: 32 },
  emptyText: { fontSize: 13, color: '#3D2B1F66' },
});
