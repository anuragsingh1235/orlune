# 🎬⚔️ Watchlist Wars

A full-stack movie social network where you track films, rate them, and battle friends to prove who has the best taste.

## ✨ Features

- 🔍 **Search** movies & TV shows (powered by TMDB API)
- 📋 **Watchlist** — add, rate (1-10), review, mark as watched
- ⚔️ **Battles** — challenge friends, others vote on best watchlist
- 🏆 **Leaderboard** — global rankings by points
- 🔐 **Auth** — JWT-based login/register

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, React Router v6, Axios |
| Backend | Node.js, Express |
| Database | PostgreSQL (pgAdmin 4) |
| Auth | JWT + bcryptjs |
| Movies API | TMDB (The Movie Database) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL running locally (pgAdmin 4)
- Free TMDB API key from https://www.themoviedb.org/settings/api

---

### Step 1 — Create Database

Open pgAdmin 4 and create a new database called:
```
watchlist_wars
```

---

### Step 2 — Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `backend/.env`:
```
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/watchlist_wars
JWT_SECRET=pick_any_long_random_string_here
TMDB_API_KEY=your_tmdb_api_key_here
```

Run database migration (creates all tables):
```bash
npm run migrate
```

Start the backend server:
```bash
npm run dev
```

Backend runs at: http://localhost:5000

---

### Step 3 — Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start React app
npm start
```

Frontend runs at: http://localhost:3000

---

## 📁 Project Structure

```
watchlist-wars/
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── index.js              ← Express entry point
│       ├── config/
│       │   ├── database.js       ← PostgreSQL pool
│       │   └── migrate.js        ← Creates all DB tables
│       ├── middleware/
│       │   └── auth.js           ← JWT verification
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── moviesController.js
│       │   ├── watchlistController.js
│       │   └── battleController.js
│       └── routes/
│           ├── auth.js
│           ├── movies.js
│           ├── watchlist.js
│           └── battles.js
│
└── frontend/
    ├── package.json
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js                ← Router + providers
        ├── index.js              ← React entry point
        ├── context/
        │   └── AuthContext.js    ← Global auth state
        ├── utils/
        │   └── api.js            ← Axios instance
        ├── styles/
        │   └── globals.css       ← Dark cinema theme
        ├── components/
        │   ├── layout/
        │   │   ├── Navbar.js
        │   │   └── Navbar.css
        │   └── movies/
        │       ├── MovieCard.js
        │       └── MovieCard.css
        └── pages/
            ├── Home.js + Home.css
            ├── Login.js
            ├── Register.js
            ├── Auth.css          ← Shared auth styles
            ├── Search.js + Search.css
            ├── Watchlist.js + Watchlist.css
            ├── Battles.js + Battles.css
            └── Leaderboard.js + Leaderboard.css
```

---

## 🗄️ Database Schema

| Table | Description |
|---|---|
| `users` | Accounts with points, wins, losses |
| `watchlist_items` | Movies/TV per user with ratings & reviews |
| `battles` | Challenges between two users |
| `battle_votes` | Votes cast by third-party users |
| `follows` | User follow relationships |

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| PUT | /api/auth/profile | Update bio/avatar |

### Movies (TMDB proxy)
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/movies/trending | Trending movies & TV |
| GET | /api/movies/search?q= | Search TMDB |
| GET | /api/movies/:type/:id | Get details |

### Watchlist
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/watchlist | My watchlist |
| POST | /api/watchlist | Add item |
| PUT | /api/watchlist/:id | Update rating/review/status |
| DELETE | /api/watchlist/:id | Remove item |

### Battles
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/battles/leaderboard | Top 20 users |
| GET | /api/battles/my | My battles |
| POST | /api/battles/challenge/:id | Challenge user |
| PUT | /api/battles/:id/respond | Accept/decline |
| POST | /api/battles/:id/vote | Cast vote |
| GET | /api/battles/users/search?q= | Find users to challenge |

---

## 🎨 Theme

Dark cinema aesthetic with:
- Background: `#0a0a0f`
- Accent red: `#e50914` (Netflix-inspired)
- Gold: `#f5c518` (IMDb-inspired)
- Full responsive design

---

## 🔧 Common Issues

**"Cannot connect to database"**
→ Make sure PostgreSQL is running and your `.env` DATABASE_URL is correct

**"TMDB API error"**
→ Double-check your TMDB_API_KEY in `.env`

**"Port 3000 already in use"**
→ Run `npx kill-port 3000` or change port in `package.json`
