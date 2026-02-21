# Ecofy

Ecofy is a React Native + Expo app with an Express/MongoDB backend for:
- community posts (blogs/articles),
- civic issue workflows,
- and a marketplace for upcycled products.

It includes social-feed interactions (likes, media posts, notifications), product moderation/reporting, and profile/account management.

## Core Features

### User Feed
- Home feed with approved posts.
- Image + video post support (gallery upload).
- Like/unlike posts.
- Autoplay video preview in feed (single active video), mute toggle, tap-to-play/pause, fullscreen, auto-loop.
- Tap image to open fullscreen preview.
- Notifications panel:
  - post likes
  - product report notifications

### Civic Hub
- Municipality mapping by registered area.
- Civic issue flow entry point.
- Blog/article submission for municipality approval.

### Marketplace
- Shop listing for products.
- Product details + enquiry flow.
- Product reporting with required reason:
  - `spam`, `fake`, `offensive`, `scam`
- Report moderation rules:
  - product removed at `5` reports
  - seller upload ban for `30 days` after every `10` removed products

### My Products / My Posts
- My Products: edit/delete uploaded products.
- My Posts: edit/delete own posts.

### Settings / Profile
- Dedicated Settings page (separate from Civic Hub).
- Edit account details (first name, last name, area).
- Edit profile photo from gallery.
- Logout.
- Delete account (one confirmation) with related data cleanup.

## Moderation & Retention Rules

- Posts auto-delete after `30 days` (TTL index in MongoDB).
- Notifications retained for `15 days` (filtered + pruned).
- Report notifications are sent to product owners and can deep-link to the relevant product in My Products.

## Tech Stack

- Frontend: Expo, React Native, TypeScript, Expo Router
- Media: `expo-image-picker`, `expo-video`
- Backend: Node.js, Express, Mongoose
- Database: MongoDB

## Project Structure

- `src/` - Expo app code
  - `src/app/` - screens/routes
  - `src/services/` - API service layer
  - `src/context/` - auth state
- `backend/` - Express API + models/routes

## Setup

### 1. Install dependencies

```bash
npm install
cd backend
npm install
```

### 2. Configure environment

Frontend `.env`:
- `EXPO_PUBLIC_API_BASE_URL` (backend base URL)

Backend `.env`:
- MongoDB connection and any backend-required keys used in your local setup.

### 3. Run backend

From `backend/`:

```bash
npm start
```

### 4. Run app

From project root:

```bash
npm start
```

## Notes

- If you change profile photo/details in Settings, the Home header avatar and post avatars update from backend profile data.
- Product report confirmation is shown in-app (alert + modal status text).
