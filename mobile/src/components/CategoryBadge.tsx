import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Category } from '@canaloni/shared';
import { CATEGORY_COLORS, CATEGORY_EMOJIS, CATEGORY_LABELS } from '@canaloni/shared';

interface CategoryBadgeProps {
  category: Category;
  size?: 'sm' | 'md';
}

export function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
  const color = CATEGORY_COLORS[category];
  const emoji = CATEGORY_EMOJIS[category];
  const label = CATEGORY_LABELS[category];
  const small = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${color}22`,
          borderColor: `${color}44`,
          paddingHorizontal: small ? 6 : 10,
          paddingVertical: small ? 2 : 4,
        },
      ]}
    >
      <Text style={[styles.emoji, { fontSize: small ? 10 : 12 }]}>{emoji}</Text>
      <Text style={[styles.label, { color, fontSize: small ? 9 : 11 }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 100,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  emoji: {
    lineHeight: 16,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
