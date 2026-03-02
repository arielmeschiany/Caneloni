import type { Category } from '../types';

export const CATEGORY_COLORS: Record<Category, string> = {
  pizzeria:          '#E8472A',
  classic_italian:   '#C4622D',
  beef_meat:         '#8B1A1A',
  seafood:           '#1A6B8A',
  vineyards:         '#722F37',
  hotels:            '#2C5F8A',
  sightseeing:       '#6B7C3A',
  views_panoramas:   '#F5A623',
  beaches:           '#4AAED4',
  walking_trails:    '#5C8A3A',
  mountains:         '#7A6A5A',
  home_residential:  '#8A7A2A',
  museums_galleries: '#8A2A6B',
  local_markets:     '#D4870A',
  pharmacy:          '#2A8A4A',
  taxi_station:      '#F5C842',
  train_station:     '#4A4A4A',
  shopping:          '#E8A0BF',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  pizzeria:          'Pizzeria',
  classic_italian:   'Classic Italian',
  beef_meat:         'Beef & Meat',
  seafood:           'Seafood',
  vineyards:         'Vineyards',
  hotels:            'Hotels',
  sightseeing:       'Sightseeing',
  views_panoramas:   'Views & Panoramas',
  beaches:           'Beaches',
  walking_trails:    'Walking Trails',
  mountains:         'Mountains',
  home_residential:  'Home & Residential',
  museums_galleries: 'Museums & Galleries',
  local_markets:     'Local Markets',
  pharmacy:          'Pharmacy',
  taxi_station:      'Taxi Station',
  train_station:     'Train Station',
  shopping:          'Shopping',
};

export const CATEGORY_EMOJIS: Record<Category, string> = {
  pizzeria:          '🍕',
  classic_italian:   '🍝',
  beef_meat:         '🥩',
  seafood:           '🦞',
  vineyards:         '🍷',
  hotels:            '🏨',
  sightseeing:       '🏛️',
  views_panoramas:   '🌅',
  beaches:           '🏖️',
  walking_trails:    '🥾',
  mountains:         '⛰️',
  home_residential:  '🏠',
  museums_galleries: '🎨',
  local_markets:     '🧺',
  pharmacy:          '💊',
  taxi_station:      '🚕',
  train_station:     '🚂',
  shopping:          '🛍️',
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
