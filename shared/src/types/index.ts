export type Category = 'restaurant' | 'market' | 'street' | 'store' | 'boutique';

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
  // Joined fields
  avg_rating?: number | null;
  review_count?: number;
  creator_username?: string | null;
}

export interface Review {
  id: string;
  location_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  // Joined fields
  username?: string | null;
  avatar_url?: string | null;
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

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'market', label: 'Market' },
  { value: 'street', label: 'Street' },
  { value: 'store', label: 'Store' },
  { value: 'boutique', label: 'Boutique' },
];

export const TUSCANY_CENTER = {
  lat: 43.7711,
  lng: 11.2486,
};

export const DEFAULT_ZOOM = 9;
