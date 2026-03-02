/**
 * Canaloni custom map icon library.
 *
 * Generates SVG data-URI pin icons for Google Maps markers.
 * Each pin is a 40×50 circle-with-pointer shape styled per category.
 *
 * NOTE: This module uses google.maps constructors (Size, Point) which are
 * only available once the Maps JS API has loaded. Import/call only from
 * browser-context code (e.g. inside MapView which is dynamically imported
 * with ssr:false).
 */

import type { Category } from '@canaloni/shared';

interface PinDef {
  emoji: string;
  color: string;
}

const PIN_DEFS: Record<Category, PinDef> = {
  pizzeria:          { emoji: '🍕', color: '#E8472A' },
  classic_italian:   { emoji: '🍝', color: '#C4622D' },
  beef_meat:         { emoji: '🥩', color: '#8B1A1A' },
  seafood:           { emoji: '🦞', color: '#1A6B8A' },
  vineyards:         { emoji: '🍷', color: '#722F37' },
  hotels:            { emoji: '🏨', color: '#2C5F8A' },
  sightseeing:       { emoji: '🏛️', color: '#6B7C3A' },
  views_panoramas:   { emoji: '🌅', color: '#F5A623' },
  beaches:           { emoji: '🏖️', color: '#4AAED4' },
  walking_trails:    { emoji: '🥾', color: '#5C8A3A' },
  mountains:         { emoji: '⛰️', color: '#7A6A5A' },
  home_residential:  { emoji: '🏠', color: '#8A7A2A' },
  museums_galleries: { emoji: '🎨', color: '#8A2A6B' },
  local_markets:     { emoji: '🧺', color: '#D4870A' },
  pharmacy:          { emoji: '💊', color: '#2A8A4A' },
  taxi_station:      { emoji: '🚕', color: '#F5C842' },
  train_station:     { emoji: '🚂', color: '#4A4A4A' },
};

/**
 * Builds an SVG string for a circular map pin with a downward pointer.
 *
 * Layout (40×50 viewBox):
 *  - White border circle  r=18 at (20, 20)
 *  - Colored fill circle  r=16 at (20, 20)
 *  - Colored triangle pointer from y=34 to tip at (20, 48)
 *  - Shadow: semi-transparent copies offset by (1, 2)
 *  - Emoji centered at (20, 20)
 */
function buildPinSvg(emoji: string, color: string): string {
  // Shadow shapes (drawn first, offset)
  const shadow = `
    <polygon points="14,34 26,34 20,48" fill="rgba(0,0,0,0.22)" transform="translate(1,2)"/>
    <circle cx="20" cy="20" r="18" fill="rgba(0,0,0,0.22)" transform="translate(1,2)"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">${shadow}
  <polygon points="14,34 26,34 20,48" fill="${color}"/>
  <circle cx="20" cy="20" r="18" fill="white"/>
  <circle cx="20" cy="20" r="16" fill="${color}"/>
  <text x="20" y="20" text-anchor="middle" dominant-baseline="central" font-size="17" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${emoji}</text>
</svg>`;
}

/**
 * Returns a google.maps.Icon for a given category.
 *
 * @param category  Location category value
 * @param selected  When true, renders at 1.15× scale for the selected/active state
 */
export function createMarkerIcon(category: string, selected = false): google.maps.Icon {
  const def = PIN_DEFS[category as Category] ?? PIN_DEFS.sightseeing;
  const scale = selected ? 1.15 : 1;
  const w = Math.round(40 * scale);
  const h = Math.round(50 * scale);
  const svg = buildPinSvg(def.emoji, def.color);

  return {
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(w, h),
    // Anchor at the pointer tip — proportional to scaled dimensions
    anchor: new google.maps.Point(Math.round(w / 2), Math.round(h * 0.96)),
  };
}
