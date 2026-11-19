# FoodRate - Family Food Rating Tracker

A full-stack application for storing food ratings for each family member.

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite + Tailwind CSS
- **Backend**: Fastify + TypeScript
- **Database**: [Turso](https://turso.tech) (libSQL) - supports both local SQLite file and remote Turso cloud

## Project Structure

```
foodrate/
├── backend/              # Fastify API server
│   ├── src/
│   │   ├── index.ts         # Server entry point
│   │   ├── database.ts      # Turso database setup
│   │   └── routes/
│   │       ├── familyMembers.ts
│   │       └── foodRatings.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/             # Vue 3 SPA
│   ├── src/
│   │   ├── main.ts
│   │   ├── App.vue
│   │   ├── api.ts           # API client
│   │   ├── types.ts         # TypeScript types
│   │   ├── style.css        # Tailwind styles
│   │   └── components/
│   │       ├── FamilyMemberManager.vue
│   │       ├── RatingForm.vue
│   │       └── RatingList.vue
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
```

**Database options:**

1. **Local SQLite** (default, no config needed):

   ```bash
   npm run dev
   ```

   Creates `database.sqlite` in the backend folder.

2. **Remote Turso** (cloud database):
   ```bash
   export TURSO_URL="libsql://your-database.turso.io"
   export TURSO_AUTH_TOKEN="your-token-here"
   npm run dev
   ```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs on `http://localhost:5173` and proxies API requests to the backend on `http://localhost:3001`.

## API Endpoints

### Family Members

| Method | Endpoint                  | Description             |
| ------ | ------------------------- | ----------------------- |
| GET    | `/api/family-members`     | List all family members |
| POST   | `/api/family-members`     | Create a family member  |
| DELETE | `/api/family-members/:id` | Delete a family member  |

### Food Ratings

| Method | Endpoint                | Description                                                |
| ------ | ----------------------- | ---------------------------------------------------------- |
| GET    | `/api/food-ratings`     | List ratings (filter by `family_member_id` or `food_name`) |
| POST   | `/api/food-ratings`     | Create a rating                                            |
| PUT    | `/api/food-ratings/:id` | Update a rating                                            |
| DELETE | `/api/food-ratings/:id` | Delete a rating                                            |

## Features

- ✅ Add/remove family members
- ✅ Rate foods from 1-5 stars
- ✅ Add optional notes to ratings
- ✅ Filter ratings by family member
- ✅ Search ratings by food name
- ✅ Interactive star rating input
- ✅ Responsive layout
