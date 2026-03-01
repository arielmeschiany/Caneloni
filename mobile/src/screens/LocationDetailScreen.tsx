import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { Location, Review } from '@canaloni/shared';
import { formatDate, formatRating } from '@canaloni/shared';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { StarRating } from '@/components/StarRating';
import { CategoryBadge } from '@/components/CategoryBadge';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'LocationDetail'>;
  route: RouteProp<RootStackParamList, 'LocationDetail'>;
};

export function LocationDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { locationId } = route.params;

  const [location, setLocation] = useState<Location | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLocation = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('locations_with_stats' as any)
        .select('*')
        .eq('id', locationId)
        .single();
      if (data) setLocation(data as Location);
    } catch {
      const { data } = await supabase
        .from('locations')
        .select('*')
        .eq('id', locationId)
        .single();
      if (data) setLocation(data as Location);
    }
  }, [locationId]);

  const fetchReviews = useCallback(async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*, profiles(username, avatar_url)')
      .eq('location_id', locationId)
      .order('created_at', { ascending: false });

    if (data) {
      setReviews(data.map((r: any) => ({
        ...r,
        username: r.profiles?.username ?? 'Anonymous',
        avatar_url: r.profiles?.avatar_url,
      })));
    }
  }, [locationId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchLocation(), fetchReviews()]);
      setLoading(false);
    };
    load();
  }, [fetchLocation, fetchReviews]);

  const handleSubmitReview = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to leave a review.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => navigation.navigate('Auth') },
      ]);
      return;
    }

    if (rating === 0) {
      Alert.alert('Error', 'Please select a star rating.');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('reviews').upsert({
      location_id: locationId,
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setRating(0);
      setComment('');
      await Promise.all([fetchLocation(), fetchReviews()]);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#C4622D" />
      </View>
    );
  }

  if (!location) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Location not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnHeader}>
          <Text style={styles.backBtnHeaderText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{location.name}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}>
        {/* Photo */}
        {location.photo_url && (
          <Image source={{ uri: location.photo_url }} style={styles.photo} resizeMode="cover" />
        )}

        {/* Info */}
        <View style={styles.section}>
          <CategoryBadge category={location.category} />
          <Text style={styles.name}>{location.name}</Text>

          <View style={styles.ratingRow}>
            {location.avg_rating != null ? (
              <>
                <StarRating rating={location.avg_rating} size={16} />
                <Text style={styles.ratingText}>{formatRating(location.avg_rating)}</Text>
                <Text style={styles.reviewCountText}>
                  ({location.review_count ?? reviews.length} review{(location.review_count ?? reviews.length) !== 1 ? 's' : ''})
                </Text>
              </>
            ) : (
              <Text style={styles.noRatingText}>No ratings yet</Text>
            )}
          </View>

          {location.description ? (
            <Text style={styles.description}>{location.description}</Text>
          ) : null}

          <Text style={styles.coords}>📍 {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</Text>
        </View>

        <View style={styles.divider} />

        {/* Review form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leave a Review</Text>

          <View style={styles.ratingPickerRow}>
            <Text style={styles.ratingLabel}>Your rating</Text>
            <StarRating rating={rating} interactive onRate={setRating} size={28} />
          </View>

          <TextInput
            style={[styles.input, styles.commentInput]}
            value={comment}
            onChangeText={setComment}
            placeholder="Share your experience… (optional)"
            placeholderTextColor="#3D2B1F55"
            multiline
            numberOfLines={3}
            maxLength={500}
          />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmitReview}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.submitBtnText}>{submitting ? 'Posting…' : 'Post Review'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Reviews list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Reviews {reviews.length > 0 && <Text style={styles.reviewCountBadge}>({reviews.length})</Text>}
          </Text>

          {reviews.length === 0 ? (
            <Text style={styles.noReviewsText}>No reviews yet. Be the first!</Text>
          ) : (
            reviews.map(review => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(review.username ?? 'A').slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.reviewMeta}>
                    <Text style={styles.reviewUsername}>{review.username ?? 'Anonymous'}</Text>
                    <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                  </View>
                </View>
                <StarRating rating={review.rating} size={14} />
                {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F0E8' },
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
  backBtnHeader: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backBtnHeaderText: { fontSize: 22, color: '#C4622D' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#3D2B1F' },
  scroll: { flex: 1 },
  scrollContent: { gap: 0 },
  photo: { width: '100%', height: 200 },
  section: { padding: 16, gap: 10 },
  name: { fontSize: 22, fontWeight: '800', color: '#3D2B1F', letterSpacing: -0.5 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingText: { fontSize: 14, fontWeight: '700', color: '#D97706' },
  reviewCountText: { fontSize: 12, color: '#3D2B1F66' },
  noRatingText: { fontSize: 13, color: '#3D2B1F66', fontStyle: 'italic' },
  description: { fontSize: 14, color: '#3D2B1F99', lineHeight: 21 },
  coords: { fontSize: 11, color: '#3D2B1F44', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  divider: { height: 8, backgroundColor: '#E8DDD0' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#3D2B1F' },
  ratingPickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingLabel: { fontSize: 13, color: '#3D2B1F88' },
  input: {
    borderWidth: 1.5,
    borderColor: '#3D2B1F22',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: '#3D2B1F',
    backgroundColor: '#FFFFFF',
  },
  commentInput: { height: 88, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: '#C4622D',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  noReviewsText: { fontSize: 14, color: '#3D2B1F66', fontStyle: 'italic' },
  reviewCard: { gap: 6, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E8DDD0' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#C4622D22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#C4622D' },
  reviewMeta: { gap: 1 },
  reviewUsername: { fontSize: 13, fontWeight: '600', color: '#3D2B1F' },
  reviewDate: { fontSize: 11, color: '#3D2B1F55' },
  reviewComment: { fontSize: 13, color: '#3D2B1F88', lineHeight: 19 },
  errorText: { fontSize: 16, color: '#3D2B1F88' },
  backBtn: { marginTop: 12 },
  backBtnText: { color: '#C4622D', fontSize: 15 },
  reviewCountBadge: { color: '#3D2B1F55', fontWeight: '400' },
});
