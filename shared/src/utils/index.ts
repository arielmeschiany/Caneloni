import type { Category } from '../types';

export const CATEGORY_COLORS: Record<Category, string> = {
  restaurant: '#C4622D',
  market: '#6B7C3A',
  street: '#5B8AA8',
  store: '#8B5E9E',
  boutique: '#D4846E',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  restaurant: 'Restaurant',
  market: 'Market',
  street: 'Street',
  store: 'Store',
  boutique: 'Boutique',
};

export const CATEGORY_EMOJIS: Record<Category, string> = {
  restaurant: '🍽️',
  market: '🛒',
  street: '🏛️',
  store: '🏪',
  boutique: '👗',
};

export function getCategoryColor(category: Category): string {
  return CATEGORY_COLORS[category] ?? '#C4622D';
}

export function getCategoryLabel(category: Category): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function getCategoryEmoji(category: Category): string {
  return CATEGORY_EMOJIS[category] ?? '📍';
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatRating(rating: number | null | undefined): string {
  if (rating == null) return 'No ratings yet';
  return rating.toFixed(1);
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '…';
}
