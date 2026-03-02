export type Category =
  | 'pizzeria'
  | 'classic_italian'
  | 'beef_meat'
  | 'seafood'
  | 'vineyards'
  | 'hotels'
  | 'sightseeing'
  | 'views_panoramas'
  | 'beaches'
  | 'walking_trails'
  | 'mountains'
  | 'home_residential'
  | 'museums_galleries'
  | 'local_markets'
  | 'pharmacy'
  | 'taxi_station'
  | 'train_station'
  | 'shopping';

export interface Location {
  id: string;
  name: string;
  category: Category;
  description: string | null;
  lat: number;
  lng: number;
  photo_url: string | null;
  created_by: string | null;
  created_at: string;
  guest_name?: string | null;
  // Joined fields
  avg_rating?: number | null;
  review_count?: number;
  creator_username?: string | null;
}

export interface Review {
  id: string;
  location_id: string;
  user_id: string | null;
  guest_name?: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  // Joined fields
  username?: string | null;
  avatar_url?: string | null;
}

export interface CheckIn {
  id: string;
  location_id: string;
  user_id: string | null;
  guest_name: string | null;
  visited_at: string;
}

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at?: string;
}

export interface NewLocation {
  name: string;
  category: Category;
  description: string;
  lat: number;
  lng: number;
  photo_url?: string | null;
}

export interface NewReview {
  location_id: string;
  rating: number;
  comment: string;
}

export const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'pizzeria',          label: 'Pizzeria',            emoji: '🍕' },
  { value: 'classic_italian',   label: 'Classic Italian',     emoji: '🍝' },
  { value: 'beef_meat',         label: 'Beef & Meat',         emoji: '🥩' },
  { value: 'seafood',           label: 'Seafood',             emoji: '🦞' },
  { value: 'vineyards',         label: 'Vineyards',           emoji: '🍷' },
  { value: 'hotels',            label: 'Hotels',              emoji: '🏨' },
  { value: 'sightseeing',       label: 'Sightseeing',         emoji: '🏛️' },
  { value: 'views_panoramas',   label: 'Views & Panoramas',   emoji: '🌅' },
  { value: 'beaches',           label: 'Beaches',             emoji: '🏖️' },
  { value: 'walking_trails',    label: 'Walking Trails',      emoji: '🥾' },
  { value: 'mountains',         label: 'Mountains',           emoji: '⛰️' },
  { value: 'home_residential',  label: 'Home & Residential',  emoji: '🏠' },
  { value: 'museums_galleries', label: 'Museums & Galleries', emoji: '🎨' },
  { value: 'local_markets',     label: 'Local Markets',       emoji: '🧺' },
  { value: 'pharmacy',          label: 'Pharmacy',            emoji: '💊' },
  { value: 'taxi_station',      label: 'Taxi Station',        emoji: '🚕' },
  { value: 'train_station',     label: 'Train Station',       emoji: '🚂' },
  { value: 'shopping',          label: 'Shopping',            emoji: '🛍️' },
];

export const TUSCANY_CENTER = {
  lat: 43.7711,
  lng: 11.2486,
};

export const DEFAULT_ZOOM = 9;
