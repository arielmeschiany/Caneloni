'use client';

import type { Category } from '@canaloni/shared';
import { CATEGORIES } from '@canaloni/shared';

const SHORT_LABELS: Record<Category, string> = {
  pizzeria: 'Pizzeria',
  classic_italian: 'Italian',
  beef_meat: 'Beef & Meat',
  seafood: 'Seafood',
  vineyards: 'Vineyards',
  hotels: 'Hotels',
  sightseeing: 'Sightseeing',
  views_panoramas: 'Views',
  beaches: 'Beaches',
  walking_trails: 'Trails',
  mountains: 'Mountains',
  home_residential: 'Residential',
  museums_galleries: 'Museums',
  local_markets: 'Markets',
  pharmacy: 'Pharmacy',
  taxi_station: 'Taxi',
  train_station: 'Train',
};

interface FilterBarProps {
  activeCategory: Category | 'all';
  onCategoryChange: (cat: Category | 'all') => void;
  showTrails: boolean;
  onToggleTrails: () => void;
}

export function FilterBar({ activeCategory, onCategoryChange, showTrails, onToggleTrails }: FilterBarProps) {
  return (
    <nav className="flex items-center gap-1.5 overflow-x-auto py-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* All button */}
      <button
        onClick={() => onCategoryChange('all')}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
          activeCategory === 'all'
            ? 'bg-terracotta text-white'
            : 'bg-white/90 text-brown hover:bg-white'
        }`}
      >
        🗺️ All
      </button>

      {/* Category buttons */}
      {CATEGORIES.map(c => (
        <button
          key={c.value}
          onClick={() => onCategoryChange(c.value)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
            activeCategory === c.value
              ? 'bg-terracotta text-white'
              : 'bg-white/90 text-brown hover:bg-white'
          }`}
        >
          {c.emoji} {SHORT_LABELS[c.value]}
        </button>
      ))}

      {/* Divider */}
      <div className="w-px bg-brown/20 mx-1 self-stretch shrink-0" />

      {/* Trails toggle */}
      <button
        onClick={onToggleTrails}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
          showTrails
            ? 'bg-olive text-white'
            : 'bg-white/90 text-brown hover:bg-white'
        }`}
      >
        🥾 Trails
      </button>
    </nav>
  );
}
