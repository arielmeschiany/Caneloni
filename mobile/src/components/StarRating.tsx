import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native';

interface StarRatingProps {
  rating: number;
  max?: number;
  interactive?: boolean;
  size?: number;
  onRate?: (rating: number) => void;
}

export function StarRating({
  rating,
  max = 5,
  interactive = false,
  size = 18,
  onRate,
}: StarRatingProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: max }, (_, i) => {
        const value = i + 1;
        const filled = value <= rating;

        const star = (
          <Text
            key={i}
            style={[
              styles.star,
              { fontSize: size },
              filled ? styles.filled : styles.empty,
            ]}
          >
            ★
          </Text>
        );

        if (!interactive) return star;

        return (
          <TouchableOpacity key={i} onPress={() => onRate?.(value)} activeOpacity={0.7}>
            {star}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  star: {
    lineHeight: undefined,
  },
  filled: {
    color: '#FBBF24',
  },
  empty: {
    color: '#E5E7EB',
  },
});
