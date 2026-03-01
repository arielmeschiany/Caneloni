# 🏛️ Canaloni

**Community-driven location discovery platform for Tuscany, Italy.**

Pin restaurants, markets, streets, stores & boutiques. Leave reviews. Explore the region—on web and mobile.

---

## Project Structure

```
canaloni/
├── shared/              # Shared TypeScript types, utils & Supabase DB types
│   ├── src/
│   │   ├── types/       # Location, Review, Profile, Category types
│   │   ├── utils/       # Category colors, labels, helpers
│   │   └── supabase/    # Database type definitions
│   └── supabase/
│       └── migrations/
│           └── 001_initial.sql   # Full DB schema
├── web/                 # Next.js 14 web app
│   └── src/
│       ├── app/         # App Router pages + API routes
│       ├── components/  # Map, Location, Auth, UI components
│       ├── hooks/       # useAuth, useLocations, useGeolocation
│       └── lib/         # Supabase client
└── mobile/              # Expo React Native app
    ├── App.tsx
    └── src/
        ├── screens/     # Map, LocationDetail, AddLocation, Auth, Profile
        ├── components/  # BottomSheet, StarRating, CategoryBadge
        ├── hooks/       # useAuth, useLocations, useLocation
        ├── navigation/  # Stack + Tab navigators
        └── lib/         # Supabase client (with SecureStore)
```

---

## Prerequisites

- **Node.js** v18+
- **npm** v9+ (workspaces support)
- **Expo CLI**: `npm install -g expo-cli` or use `npx expo`
- **Supabase** account: [supabase.com](https://supabase.com)
- **Google Maps API** key with Maps JavaScript API + Maps SDK for iOS/Android enabled

---

## 1. Supabase Setup

### 1a. Create a Supabase project
1. Go to [supabase.com](https://supabase.com) → New project
2. Note your **Project URL** and **anon/public API key** from Settings → API

### 1b. Run the database migration
Open the SQL Editor in your Supabase dashboard and paste the contents of:
```
shared/supabase/migrations/001_initial.sql
```
Run it. This creates:
- `profiles` table (auto-created on user signup)
- `locations` table with category enum check
- `reviews` table (one review per user per location)
- `locations_with_stats` view (locations + avg rating + review count)
- Row Level Security policies
- Auth trigger to auto-create profile on signup

### 1c. Enable Realtime
In Supabase dashboard → Database → Replication, enable realtime for `locations` and `reviews` tables.

### 1d. Create storage bucket (for photo uploads)
In Supabase → Storage, create a bucket named **`location-photos`** with **Public** access.

---

## 2. Environment Variables

### Web (`/web/.env.local`)
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Mobile (`/mobile/app.json` — `extra` section)
Edit `mobile/app.json` and replace the placeholder values in the `extra` block:
```json
"extra": {
  "supabaseUrl": "https://your-project.supabase.co",
  "supabaseAnonKey": "your_supabase_anon_key",
  "googleMapsApiKey": "your_google_maps_api_key"
}
```
Also update the Google Maps API key in:
- `ios.config.googleMapsApiKey`
- `android.config.googleMaps.apiKey`

---

## 3. Install Dependencies

From the monorepo root:

```bash
npm install
```

This installs dependencies for all workspaces (`shared`, `web`, `mobile`).

---

## 4. Run the Web App

```bash
npm run web
# or
cd web && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 5. Run the Mobile App

```bash
npm run mobile
# or
cd mobile && npx expo start
```

Then:
- Press `i` to open in iOS Simulator
- Press `a` to open in Android Emulator
- Scan QR code with **Expo Go** app on your device

### iOS Simulator note
Google Maps on iOS requires a physical device or a properly configured simulator with the API key embedded.

---

## Features

### Map Screen
- Full-screen Google Map centered on Tuscany (43.7711, 11.2486, zoom 9)
- Custom colored pins per category (restaurant=terracotta, market=olive, street=sky, store=purple, boutique=rose)
- Tap pin → popup with name, rating, description, "View details" button
- Tap map to drop a pending coordinate → "Pin here" action
- Real-time updates via Supabase subscriptions

### Add Location
- Floating `+` button on map
- Form: Name, Category dropdown, Description, Coordinates, Photo upload
- "Use my location" via browser Geolocation / Expo Location
- Click-to-prefill: tap the map first to pre-populate lat/lng
- Saves to database → immediately visible on map

### Location Detail
- Category badge, name, average star rating, description
- Photo (if uploaded)
- Review form (star picker + text comment, requires sign-in)
- Full list of reviews sorted by newest

### Authentication
- Email/password via Supabase Auth
- Anonymous browsing (read-only)
- Sign-in prompt when trying to add location or review
- Auto-creates profile on first signup

### Profile
- User's pinned locations
- User's reviews
- Sign out button

---

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Terracotta | `#C4622D` | Primary actions, restaurant pins |
| Olive | `#6B7C3A` | Market pins, success |
| Cream | `#F5F0E8` | Background |
| Deep Brown | `#3D2B1F` | Text |
| Sky | `#5B8AA8` | Street pins |
| Purple | `#8B5E9E` | Store pins |
| Rose | `#D4846E` | Boutique pins |

---

## Category Reference

| Category | Emoji | Color |
|----------|-------|-------|
| Restaurant | 🍽️ | Terracotta `#C4622D` |
| Market | 🛒 | Olive `#6B7C3A` |
| Street | 🏛️ | Sky `#5B8AA8` |
| Store | 🏪 | Purple `#8B5E9E` |
| Boutique | 👗 | Rose `#D4846E` |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Mobile frontend | Expo SDK 50 + React Native 0.73 |
| Maps (web) | `@react-google-maps/api` |
| Maps (mobile) | `react-native-maps` (Google Maps provider) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Realtime | Supabase Realtime subscriptions |
| Storage | Supabase Storage (photos) |
| Shared types | TypeScript workspace package `@canaloni/shared` |

---

## API Routes (Web)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/locations` | List all locations (with stats) |
| POST | `/api/locations` | Create a location (auth required) |
| GET | `/api/locations/[id]` | Get single location |
| DELETE | `/api/locations/[id]` | Delete location (owner only) |
| GET | `/api/reviews?location_id=` | Get reviews for a location |
| POST | `/api/reviews` | Create/update review (auth required) |

---

## Database Schema

```sql
profiles   (id, username, avatar_url, created_at)
locations  (id, name, category, description, lat, lng, photo_url, created_by, created_at)
reviews    (id, location_id, user_id, rating, comment, created_at)

-- View
locations_with_stats  (all location fields + avg_rating, review_count, creator_username)
```

---

## Deployment

### Web (Vercel)
1. Push to GitHub
2. Import to [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

### Mobile (EAS Build)
```bash
npm install -g eas-cli
cd mobile
eas build --platform all
```

---

Made with ❤️ for Tuscany.
