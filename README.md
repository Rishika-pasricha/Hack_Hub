# Ecofy

Ecofy is a full-stack civic engagement and sustainable marketplace app built with Expo (React Native + TypeScript) and an Express + MongoDB backend.

The platform combines:
- community blogs with municipality moderation,
- civic issue reporting with media evidence,
- municipality admin analytics,
- and an eco-friendly product marketplace with report-based moderation.

## Current Features

### Authentication and Accounts
- User registration and login.
- Municipality/admin login via municipality contact email.
- Forgot-password OTP flow:
  - send OTP,
  - verify OTP,
  - reset password.
- Profile update (name, area, profile image).
- Account deletion with related data cleanup.

### Community Blogs
- Submit blogs with text and/or media (image/video).
- Up to 4 media attachments per post.
- Municipality approval pipeline (`pending` -> `approved`).
- Like/unlike approved posts.
- My Posts management (edit/delete).
- Approved posts are auto-expired after 30 days (MongoDB TTL).

### Civic Issues
- Submit civic issues with required media evidence.
- Track personal issue history.
- Mark own issues as resolved.
- Municipality admin can request completion confirmation for an issue.
- User issue-completion notifications (mark as read).
- Municipality leaderboard by issue resolution performance.

### Municipality Admin Dashboard
- Pending blog moderation.
- Open issue management.
- Issue completion request notifications via email + in-app message.
- Activity analytics endpoint with metrics such as:
  - total/resolved/open issues,
  - weekly trends,
  - weekday distribution,
  - citizen participation,
  - media adoption rates.

### Marketplace
- Product listing with 1-4 media items (image/video).
- My Products management (edit/delete).
- Product reporting reasons:
  - `spam`,
  - `fake`,
  - `offensive`,
  - `scam`.
- Moderation rules:
  - product auto-removal at 5 reports,
  - seller upload ban for 30 days after every 10 removed products.

### Data and Notifications
- Municipality records are synced from CSV on backend startup.
- Product report notifications are stored on user profiles.
- Notification retention filtering is applied for older records.

## Tech Stack

- Frontend: Expo, React Native, TypeScript, Expo Router
- Backend: Node.js, Express, Mongoose
- Database: MongoDB
- Media: `expo-image-picker`, `expo-video`
- Email: Nodemailer / Resend integration (OTP and issue completion flows)

## Repository Structure

```text
.
|-- src/                         # Expo application
|   |-- app/                     # Routes and screens
|   |-- components/              # Reusable UI
|   |-- context/                 # Auth context
|   |-- services/                # API client + domain services
|   `-- types/                   # TypeScript types
|-- backend/                     # Express API
|   |-- app.js                   # Server entry
|   |-- config/                  # MongoDB config
|   |-- models/                  # Mongoose models
|   |-- routes/                  # API routes
|   |-- scripts/                 # Data import scripts
|   `-- utils/                   # Email + sync utilities
|-- municipality_dataset.csv     # Municipality source data
`-- render.yaml                  # Render deployment config
```

## Environment Variables

Create these files before running locally:

### Root `.env` (frontend)

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8082
```

### `backend/.env`

```env
MONGO_URI=your_mongodb_connection_string
PORT=8082
NODE_ENV=development
```

If email features are enabled in your setup, also add the provider-specific keys required by `backend/utils/emailService.js`.

## Local Development

### 1. Install dependencies

```bash
npm install
cd backend
npm install
```

### 2. Run backend

From `backend/`:

```bash
node app.js
```

### 3. Run frontend app

From project root:

```bash
npm start
```

Optional Expo targets:

```bash
npm run android
npm run ios
npm run web
```

## Municipality Data Import

Municipality data sync runs automatically on backend startup.

To run it manually:

```bash
cd backend
npm run import:municipalities
```

## API Overview

Main route groups in `backend/routes/userRouter.js`:
- Auth: `/register`, `/login`, `/forgot-password`, `/verify-otp`, `/reset-password`
- Profile: `/profile`, `/account`
- Blogs: `/blogs`, `/blogs/my`, `/blogs/submit`, `/blogs/:id`, `/blogs/:id/like`
- Issues: `/issues/submit`, `/issues/my`, `/issues/:id/resolve`, `/issues/leaderboard`
- Admin: `/admin/pending-blogs`, `/admin/blogs/:id/approve`, `/admin/issues`, `/admin/issues/:issueId/request-completion`, `/municipality/activity-analytics`
- Products: `/products`, `/products/my`, `/products/submit`, `/products/:id`, `/products/:id/report`
- Notifications: `/notifications/likes`, `/notifications/issue-completion`, `/notifications/issue-completion/:issueId/read`

## Deployment

`render.yaml` is configured to deploy the backend service from `backend/` using:
- build: `npm install`
- start: `node app.js`

Required Render environment variable:
- `MONGO_URI`

## Notes

- Backend currently has no `npm test` implementation.
- The backend mounts `userRouter` at root (`/`), so paths above are direct route paths.
